import { NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin-auth';
import { supabaseRest } from '@/lib/supabase-rest';

type MediaType = 'movie' | 'tv';
type MovieStatus = 'draft' | 'review' | 'published' | 'broken' | 'hidden';

type CatalogRow = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  title_en?: string | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  rating?: number | string | null;
  release_year?: string | null;
  genres?: string[] | null;
  language?: string | null;
  runtime?: number | null;
  source_bucket?: string | null;
  updated_at?: string | null;
};

type SavedLink = {
  id?: string;
  tmdb_id: number;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  is_active?: boolean;
  notes?: string | null;
  section_slug?: string;
  status?: MovieStatus;
  created_at?: string;
  updated_at?: string;
};

function key(mediaType: MediaType, id: number) {
  return `${mediaType}-${id}`;
}

function normalize(value: unknown) {
  return String(value || '').toLowerCase().trim();
}

function orderBy(sort: string) {
  if (sort === 'newest') return 'release_date.desc.nullslast,rating.desc';
  if (sort === 'oldest') return 'release_date.asc.nullsfirst,rating.desc';
  if (sort === 'popular') return 'popularity.desc,rating.desc';
  if (sort === 'updated') return 'updated_at.desc.nullslast,rating.desc';
  return 'sort_score.desc,rating.desc';
}

async function savedLinks() {
  const map = new Map<string, SavedLink>();
  for (let offset = 0; offset < 5000; offset += 1000) {
    const rows = await supabaseRest<SavedLink[]>(`admin_movie_links?select=id,tmdb_id,media_type,title,title_th,watch_url,trailer_url,provider,is_active,notes,section_slug,status,created_at,updated_at&limit=1000&offset=${offset}`, { mode: 'service' });
    for (const row of rows || []) map.set(key(row.media_type, row.tmdb_id), row);
    if (!rows?.length || rows.length < 1000) break;
  }
  return map;
}

function merge(row: CatalogRow, saved?: SavedLink) {
  const watchUrl = saved?.watch_url?.trim() || null;
  return {
    id: saved?.id || '',
    tmdb_id: row.tmdb_id,
    media_type: row.media_type,
    title: saved?.title || row.title_en || row.title || null,
    title_th: saved?.title_th || row.title || row.title_en || null,
    watch_url: watchUrl,
    trailer_url: saved?.trailer_url || null,
    provider: saved?.provider || null,
    is_active: saved?.is_active ?? true,
    notes: saved?.notes || null,
    section_slug: saved?.section_slug || row.source_bucket || 'top-rated',
    status: watchUrl ? 'published' : saved?.status || 'draft',
    created_at: saved?.created_at,
    updated_at: saved?.updated_at || row.updated_at || undefined,
    poster_url: row.poster_url || null,
    backdrop_url: row.backdrop_url || null,
    rating: Number(row.rating || 0),
    year: row.release_year || undefined,
    language: row.language || undefined,
    runtime: row.runtime || null,
    genres: row.genres || [],
  };
}

type MergedItem = ReturnType<typeof merge>;

function statusMatch(item: MergedItem, status: string) {
  if (status === 'missing') return !item.watch_url;
  if (status === 'ready') return Boolean(item.watch_url);
  if (status === 'review') return item.status === 'review' || item.status === 'draft';
  if (status === 'draft') return item.status === 'draft';
  if (status === 'published') return item.status === 'published' || Boolean(item.watch_url);
  if (status === 'broken') return item.status === 'broken';
  if (status === 'hidden') return item.status === 'hidden' || item.is_active === false;
  if (status === 'no-trailer') return !item.trailer_url;
  if (status === 'has-trailer') return Boolean(item.trailer_url);
  return true;
}

function queryText(item: MergedItem) {
  return normalize([
    item.tmdb_id,
    item.media_type,
    item.title,
    item.title_th,
    item.year,
    item.language,
    item.provider,
    item.notes,
    item.section_slug,
    item.status,
    ...(item.genres || []),
  ].filter(Boolean).join(' '));
}

function queryMatch(item: MergedItem, q: string) {
  const keyword = normalize(q);
  if (!keyword) return true;
  return queryText(item).includes(keyword);
}

function hasPosterMatch(item: MergedItem, value: string) {
  if (value === 'with-poster') return Boolean(item.poster_url);
  if (value === 'no-poster') return !item.poster_url;
  return true;
}

export async function GET(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const params = new URL(request.url).searchParams;
  const q = params.get('q')?.trim() || '';
  const source = params.get('source')?.trim() || 'all';
  const media = params.get('media')?.trim() || 'all';
  const status = params.get('status')?.trim() || 'all';
  const sort = params.get('sort')?.trim() || 'rating';
  const poster = params.get('poster')?.trim() || 'with-poster';
  const limit = Math.min(Math.max(Number(params.get('limit') || 240), 24), 1000);
  const offset = Math.max(Number(params.get('offset') || 0), 0);

  const dbLimit = q || status !== 'all' || poster !== 'with-poster' ? Math.min(1000, Math.max(limit * 3, 600)) : limit;
  const dbOffset = q || status !== 'all' || poster !== 'with-poster' ? 0 : offset;

  const filters = [
    'select=tmdb_id,media_type,title,title_en,poster_url,backdrop_url,rating,release_year,genres,language,runtime,source_bucket,updated_at',
    'is_active=eq.true',
    `order=${encodeURIComponent(orderBy(sort))}`,
    `limit=${dbLimit}`,
    `offset=${dbOffset}`,
  ];

  if (source !== 'all') filters.push(`source_bucket=eq.${encodeURIComponent(source)}`);
  if (media === 'movie' || media === 'tv') filters.push(`media_type=eq.${media}`);

  const dbSearchParts = [];
  if (q) {
    dbSearchParts.push(`title.ilike.${encodeURIComponent(`*${q}*`)}`);
    dbSearchParts.push(`title_en.ilike.${encodeURIComponent(`*${q}*`)}`);
    dbSearchParts.push(`release_year.ilike.${encodeURIComponent(`*${q}*`)}`);
    dbSearchParts.push(`language.ilike.${encodeURIComponent(`*${q}*`)}`);
    dbSearchParts.push(`source_bucket.ilike.${encodeURIComponent(`*${q}*`)}`);
    const numeric = Number(q);
    if (Number.isFinite(numeric) && String(Math.floor(numeric)) === q.trim()) dbSearchParts.push(`tmdb_id.eq.${Math.floor(numeric)}`);
  }
  if (dbSearchParts.length) filters.push(`or=(${dbSearchParts.join(',')})`);

  try {
    const [rows, saved] = await Promise.all([
      supabaseRest<CatalogRow[]>(`tmdb_catalog?${filters.join('&')}`, { mode: 'service' }),
      savedLinks(),
    ]);

    const merged = (rows || [])
      .filter((row) => row.tmdb_id && row.media_type)
      .map((row) => merge(row, saved.get(key(row.media_type, row.tmdb_id))))
      .filter((item) => hasPosterMatch(item, poster))
      .filter((item) => statusMatch(item, status))
      .filter((item) => queryMatch(item, q));

    const paged = q || status !== 'all' || poster !== 'with-poster' ? merged.slice(offset, offset + limit) : merged;
    const hasMore = q || status !== 'all' || poster !== 'with-poster' ? merged.length > offset + limit : (rows || []).length === limit;

    return NextResponse.json({
      ok: true,
      links: paged,
      reports: [],
      meta: {
        q,
        source,
        media,
        status,
        sort,
        poster,
        limit,
        offset,
        returned: paged.length,
        matched: merged.length,
        hasMore,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot load catalog' }, { status: 500 });
  }
}
