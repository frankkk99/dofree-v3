import { NextResponse } from 'next/server';
import { requireAdminToken } from '@/lib/admin-auth';
import { supabaseRest } from '@/lib/supabase-rest';

type MediaType = 'movie' | 'tv';
type MovieStatus = 'draft' | 'review' | 'published' | 'broken' | 'hidden';

type AdminMovieLink = {
  id: string;
  tmdb_id: number;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  is_active: boolean;
  notes?: string | null;
  section_slug: string;
  status: MovieStatus;
  created_at?: string;
  updated_at?: string;
  poster_url?: string | null;
  backdrop_url?: string | null;
  rating?: number;
  year?: string;
  language?: string;
  runtime?: number | null;
  genres?: string[];
};

type LinkReport = {
  id: string;
  tmdb_id?: number | null;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  url?: string | null;
  reason: string;
  detail?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type TmdbDetail = {
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  original_language?: string;
  runtime?: number;
  episode_run_time?: number[];
  genres?: { id: number; name: string }[];
};

const validMediaTypes = new Set(['movie', 'tv']);
const validStatuses = new Set(['draft', 'review', 'published', 'broken', 'hidden']);
const posterBase = 'https://image.tmdb.org/t/p/w500';
const backdropBase = 'https://image.tmdb.org/t/p/original';

function cleanText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeDrivePreviewUrl(value: unknown) {
  const url = cleanText(value);
  if (!url) return undefined;

  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;

  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (url.includes('drive.google.com') && openMatch?.[1]) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;

  return url;
}

function authError(request: Request) {
  const auth = requireAdminToken(request);
  if (auth.ok) return null;
  return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
}

async function fetchTmdbDetail(item: AdminMovieLink): Promise<AdminMovieLink> {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token || !item.tmdb_id || !item.media_type) return item;

  try {
    const response = await fetch(`https://api.themoviedb.org/3/${item.media_type}/${item.tmdb_id}?language=th-TH`, {
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
      next: { revalidate: 60 * 60 },
    });

    if (!response.ok) return item;
    const data = (await response.json()) as TmdbDetail;
    const title = data.title || data.name || item.title || data.original_title || data.original_name;
    const year = (data.release_date || data.first_air_date || '').slice(0, 4) || undefined;

    return {
      ...item,
      title: item.title || data.original_title || data.original_name || title || null,
      title_th: item.title_th || title || item.title || null,
      poster_url: data.poster_path ? `${posterBase}${data.poster_path}` : null,
      backdrop_url: data.backdrop_path ? `${backdropBase}${data.backdrop_path}` : null,
      rating: Number(data.vote_average || 0),
      year,
      language: data.original_language || undefined,
      runtime: data.runtime || data.episode_run_time?.[0] || null,
      genres: data.genres?.slice(0, 3).map((genre) => genre.name) || [],
    };
  } catch {
    return item;
  }
}

async function enrichLinks(items: AdminMovieLink[]) {
  const enriched = await Promise.all(items.map((item) => fetchTmdbDetail(item)));
  return enriched.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
}

export async function GET(request: Request) {
  const errorResponse = authError(request);
  if (errorResponse) return errorResponse;

  try {
    const [links, reports] = await Promise.all([
      supabaseRest<AdminMovieLink[]>(
        'admin_movie_links?select=id,tmdb_id,media_type,title,title_th,watch_url,trailer_url,provider,is_active,notes,section_slug,status,created_at,updated_at&order=updated_at.desc&limit=100',
        { mode: 'service' }
      ),
      supabaseRest<LinkReport[]>(
        'link_reports?select=id,tmdb_id,media_type,title,title_th,url,reason,detail,status,created_at,updated_at&order=created_at.desc&limit=60',
        { mode: 'service' }
      ),
    ]);

    return NextResponse.json({ ok: true, links: await enrichLinks(links), reports });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot load admin dashboard' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const errorResponse = authError(request);
  if (errorResponse) return errorResponse;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const tmdbId = Number(body?.tmdb_id);
  const mediaType = cleanText(body?.media_type) as MediaType | undefined;
  const status = (cleanText(body?.status) || 'published') as MovieStatus;
  const watchUrl = normalizeDrivePreviewUrl(body?.watch_url);

  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ ok: false, error: 'TMDB ID ไม่ถูกต้อง' }, { status: 400 });
  }

  if (!mediaType || !validMediaTypes.has(mediaType)) {
    return NextResponse.json({ ok: false, error: 'media_type ต้องเป็น movie หรือ tv' }, { status: 400 });
  }

  if (!validStatuses.has(status)) {
    return NextResponse.json({ ok: false, error: 'status ไม่ถูกต้อง' }, { status: 400 });
  }

  if (status === 'published' && !watchUrl) {
    return NextResponse.json({ ok: false, error: 'Published ต้องมีลิงก์รับชม' }, { status: 400 });
  }

  const record = {
    tmdb_id: tmdbId,
    media_type: mediaType,
    title: cleanText(body?.title) || null,
    title_th: cleanText(body?.title_th) || cleanText(body?.title) || null,
    watch_url: watchUrl || null,
    trailer_url: normalizeDrivePreviewUrl(body?.trailer_url) || null,
    provider: cleanText(body?.provider) || 'admin',
    section_slug: cleanText(body?.section_slug) || 'watch-ready',
    status,
    is_active: status !== 'hidden',
    notes: cleanText(body?.notes) || null,
  };

  try {
    const rows = await supabaseRest<AdminMovieLink[]>('admin_movie_links?on_conflict=tmdb_id,media_type', {
      method: 'POST',
      mode: 'service',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: [record],
    });

    return NextResponse.json({ ok: true, link: rows[0] ? await fetchTmdbDetail(rows[0]) : rows[0] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot save movie link' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const errorResponse = authError(request);
  if (errorResponse) return errorResponse;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = cleanText(body?.id);

  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing link id' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  const status = cleanText(body?.status) as MovieStatus | undefined;
  if (status) {
    if (!validStatuses.has(status)) return NextResponse.json({ ok: false, error: 'status ไม่ถูกต้อง' }, { status: 400 });
    patch.status = status;
    patch.is_active = status !== 'hidden';
  }

  const watchUrl = normalizeDrivePreviewUrl(body?.watch_url);
  if (watchUrl) patch.watch_url = watchUrl;
  const trailerUrl = normalizeDrivePreviewUrl(body?.trailer_url);
  if (trailerUrl) patch.trailer_url = trailerUrl;
  const title = cleanText(body?.title);
  if (title !== undefined) patch.title = title;
  const titleTh = cleanText(body?.title_th);
  if (titleTh !== undefined) patch.title_th = titleTh;
  const sectionSlug = cleanText(body?.section_slug);
  if (sectionSlug !== undefined) patch.section_slug = sectionSlug;
  const provider = cleanText(body?.provider);
  if (provider !== undefined) patch.provider = provider;
  const notes = cleanText(body?.notes);
  if (notes !== undefined) patch.notes = notes;

  try {
    const rows = await supabaseRest<AdminMovieLink[]>(`admin_movie_links?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      mode: 'service',
      prefer: 'return=representation',
      body: patch,
    });

    return NextResponse.json({ ok: true, link: rows[0] ? await fetchTmdbDetail(rows[0]) : rows[0] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot update movie link' }, { status: 500 });
  }
}
