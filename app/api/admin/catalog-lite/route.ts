import { NextResponse } from 'next/server';
import { requireAdminToken } from '@/lib/admin-auth';
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

function orderBy(sort: string) {
  if (sort === 'newest') return 'release_date.desc.nullslast,rating.desc';
  if (sort === 'popular') return 'popularity.desc,rating.desc';
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

function statusMatch(item: ReturnType<typeof merge>, status: string) {
  if (status === 'missing') return !item.watch_url;
  if (status === 'ready') return Boolean(item.watch_url);
  if (status === 'review') return item.status === 'review' || item.status === 'draft';
  return true;
}

export async function GET(request: Request) {
  const auth = requireAdminToken(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const params = new URL(request.url).searchParams;
  const q = params.get('q')?.trim() || '';
  const source = params.get('source')?.trim() || 'all';
  const media = params.get('media')?.trim() || 'all';
  const status = params.get('status')?.trim() || 'all';
  const sort = params.get('sort')?.trim() || 'rating';
  const limit = Math.min(Math.max(Number(params.get('limit') || 240), 24), 1000);
  const offset = Math.max(Number(params.get('offset') || 0), 0);

  const filters = [
    'select=tmdb_id,media_type,title,title_en,poster_url,backdrop_url,rating,release_year,genres,language,runtime,source_bucket,updated_at',
    'is_active=eq.true',
    `order=${encodeURIComponent(orderBy(sort))}`,
    `limit=${limit}`,
    `offset=${offset}`,
  ];

  if (source !== 'all') filters.push(`source_bucket=eq.${encodeURIComponent(source)}`);
  if (media === 'movie' || media === 'tv') filters.push(`media_type=eq.${media}`);
  if (q) filters.push(`or=(title.ilike.${encodeURIComponent(`*${q}*`)},title_en.ilike.${encodeURIComponent(`*${q}*`)})`);

  try {
    const [rows, saved] = await Promise.all([
      supabaseRest<CatalogRow[]>(`tmdb_catalog?${filters.join('&')}`, { mode: 'service' }),
      savedLinks(),
    ]);

    const links = (rows || [])
      .filter((row) => row.tmdb_id && row.media_type && row.poster_url)
      .map((row) => merge(row, saved.get(key(row.media_type, row.tmdb_id))))
      .filter((item) => statusMatch(item, status));

    return NextResponse.json({ ok: true, links, reports: [], meta: { q, source, media, status, sort, limit, offset, returned: links.length, hasMore: (rows || []).length === limit } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot load catalog' }, { status: 500 });
  }
}
