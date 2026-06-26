import { NextResponse } from 'next/server';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { requireAdminAccess } from '@/lib/admin-auth';

const posterBase = 'https://image.tmdb.org/t/p/w342';
const backdropBase = 'https://image.tmdb.org/t/p/w780';

type MediaType = 'movie' | 'tv';

type TmdbSearchItem = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  original_language?: string;
};

type WatchLinkRecord = {
  tmdb_id: number;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;
  return { url, key };
}

function normalizeDrivePreviewUrl(value?: string | null) {
  const url = value?.trim();
  if (!url) return null;

  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;

  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (url.includes('drive.google.com') && openMatch?.[1]) {
    return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  }

  return url;
}

function titleOf(item: TmdbSearchItem) {
  return item.title || item.name || item.original_title || item.original_name || '';
}

function originalTitleOf(item: TmdbSearchItem) {
  return item.original_title || item.original_name || item.title || item.name || '';
}

function yearOf(item: TmdbSearchItem) {
  return (item.release_date || item.first_air_date || '').slice(0, 4);
}

async function tmdb(path: string) {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) return null;

  const response = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    next: { revalidate: 60 * 30 },
  });

  if (!response.ok) return null;
  return response.json();
}

async function fetchExistingLinks(mediaType: MediaType, ids: number[]) {
  const config = getSupabaseConfig();
  const map = new Map<number, WatchLinkRecord>();
  if (!config || !ids.length) return map;

  const uniqueIds = [...new Set(ids)].slice(0, 80).join(',');
  const endpoint = `${config.url}/rest/v1/admin_movie_links?media_type=eq.${mediaType}&tmdb_id=in.(${uniqueIds})&select=tmdb_id,media_type,title,title_th,watch_url,trailer_url,provider,notes,is_active`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) return map;

    const records = (await response.json()) as WatchLinkRecord[];
    for (const record of records) map.set(record.tmdb_id, record);
  } catch {
    return map;
  }

  return map;
}

async function upsertWatchLink(payload: WatchLinkRecord) {
  const config = getSupabaseConfig();
  if (!config) {
    return { ok: false, error: 'ยังไม่ได้ตั้งค่า Supabase ENV' };
  }

  const data = {
    tmdb_id: payload.tmdb_id,
    media_type: payload.media_type,
    title: payload.title || null,
    title_th: payload.title_th || null,
    watch_url: normalizeDrivePreviewUrl(payload.watch_url),
    trailer_url: normalizeDrivePreviewUrl(payload.trailer_url) || null,
    provider: payload.provider || 'Google Drive',
    notes: payload.notes || null,
    is_active: payload.is_active ?? true,
    updated_at: new Date().toISOString(),
  };

  const baseHeaders = {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  const filter = `tmdb_id=eq.${payload.tmdb_id}&media_type=eq.${payload.media_type}`;
  const patch = await fetch(`${config.url}/rest/v1/admin_movie_links?${filter}`, {
    method: 'PATCH',
    headers: baseHeaders,
    body: JSON.stringify(data),
  });

  if (patch.ok) {
    const patched = (await patch.json()) as unknown[];
    if (patched.length) return { ok: true, record: patched[0] };
  }

  const create = await fetch(`${config.url}/rest/v1/admin_movie_links`, {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify(data),
  });

  if (!create.ok) {
    const errorText = await create.text();
    return { ok: false, error: errorText || 'บันทึกลิงก์ไม่สำเร็จ' };
  }

  const record = await create.json();
  return { ok: true, record: Array.isArray(record) ? record[0] : record };
}

export async function GET(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const mediaType = (searchParams.get('mediaType') === 'tv' ? 'tv' : 'movie') as MediaType;
  const query = searchParams.get('query')?.trim() || '';
  const page = Number(searchParams.get('page') || '1');

  if (!query) return NextResponse.json({ results: [] });

  const data = await tmdb(`/search/${mediaType}?language=th-TH&query=${encodeURIComponent(query)}&include_adult=false&page=${page}`);
  const results = ((data?.results || []) as TmdbSearchItem[]).filter((item) => item.poster_path || item.backdrop_path).slice(0, 20);
  const links = await fetchExistingLinks(mediaType, results.map((item) => item.id));

  return NextResponse.json({
    results: results.map((item) => {
      const existing = links.get(item.id);
      return {
        tmdbId: item.id,
        mediaType,
        titleTh: titleOf(item),
        title: originalTitleOf(item),
        overview: item.overview || '',
        posterUrl: item.poster_path ? `${posterBase}${item.poster_path}` : '',
        backdropUrl: item.backdrop_path ? `${backdropBase}${item.backdrop_path}` : '',
        rating: Number(item.vote_average || 0),
        year: yearOf(item),
        language: item.original_language || '',
        watchUrl: existing?.watch_url || '',
        trailerUrl: existing?.trailer_url || '',
        provider: existing?.provider || 'Google Drive',
        notes: existing?.notes || '',
        isActive: existing?.is_active ?? true,
        hasLink: Boolean(existing?.watch_url),
      };
    }),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const tmdbId = Number(body.tmdbId);
    const mediaType = body.mediaType === 'tv' ? 'tv' : 'movie';
    const watchUrl = normalizeDrivePreviewUrl(body.watchUrl);

    if (!tmdbId || !watchUrl) {
      return NextResponse.json({ error: 'ต้องมี TMDB ID และลิงก์รับชม' }, { status: 400 });
    }

    const before = (await fetchExistingLinks(mediaType, [tmdbId])).get(tmdbId) || null;
    const result = await upsertWatchLink({
      tmdb_id: tmdbId,
      media_type: mediaType,
      title: body.title || null,
      title_th: body.titleTh || null,
      watch_url: watchUrl,
      trailer_url: body.trailerUrl || null,
      provider: body.provider || 'Google Drive',
      notes: body.notes || null,
      is_active: body.isActive ?? true,
    });

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

    await recordAdminAuditLog({
      request,
      actor: auth,
      action: before ? 'watch_link.search_update' : 'watch_link.search_create',
      entityType: 'admin_movie_links',
      entityId: `${mediaType}-${tmdbId}`,
      beforeData: before,
      afterData: result.record || null,
    });

    return NextResponse.json({ ok: true, record: result.record });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ' }, { status: 500 });
  }
}
