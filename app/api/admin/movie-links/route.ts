import { NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin-auth';
import { supabaseRest } from '@/lib/supabase-rest';

type MediaType = 'movie' | 'tv';
type MovieStatus = 'draft' | 'review' | 'published' | 'broken' | 'hidden';

type AdminMovieLink = {
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
  id?: number;
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
  genre_ids?: number[];
};

type TmdbListResponse = {
  results?: TmdbDetail[];
};

type TmdbCatalogRow = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  title_en?: string | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  rating?: number | string | null;
  release_year?: string | null;
  language?: string | null;
  runtime?: number | null;
  genres?: string[] | null;
  source_bucket?: string | null;
  updated_at?: string;
};

const validMediaTypes = new Set(['movie', 'tv']);
const validStatuses = new Set(['draft', 'review', 'published', 'broken', 'hidden']);
const posterBase = 'https://image.tmdb.org/t/p/w500';
const backdropBase = 'https://image.tmdb.org/t/p/original';

const genreNames: Record<number, string> = {
  28: 'แอ็กชัน',
  12: 'ผจญภัย',
  16: 'แอนิเมชัน',
  18: 'ดราม่า',
  27: 'สยองขวัญ',
  35: 'คอมเมดี้',
  53: 'ระทึกขวัญ',
  878: 'ไซไฟ',
  10749: 'โรแมนติก',
  99: 'สารคดี',
  14: 'แฟนตาซี',
  80: 'อาชญากรรม',
  9648: 'ลึกลับ',
};

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

function playableStatus(requested: MovieStatus, watchUrl?: string) {
  if (!watchUrl) return requested;
  if (requested === 'draft' || requested === 'review') return 'published';
  return requested;
}

async function authError(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === true) return null;
  return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
}

function linkKey(mediaType: MediaType, tmdbId: number) {
  return `${mediaType}-${tmdbId}`;
}

async function tmdb(path: string) {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const response = await fetch(`https://api.themoviedb.org/3${path}`, {
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
      next: { revalidate: 60 * 60 },
    });

    if (!response.ok) return null;
    return (await response.json()) as TmdbListResponse;
  } catch {
    return null;
  }
}

async function tmdbCollection(basePath: string, pages = 2) {
  const joiner = basePath.includes('?') ? '&' : '?';
  const responses = await Promise.all(Array.from({ length: pages }, (_, index) => tmdb(`${basePath}${joiner}page=${index + 1}`)));
  return responses.flatMap((response) => response?.results || []);
}

function toCatalogItem(item: TmdbDetail, mediaType: MediaType, sectionSlug: string): AdminMovieLink | null {
  if (!item.id || !item.poster_path) return null;

  const title = item.title || item.name || item.original_title || item.original_name;
  if (!title) return null;

  const year = (item.release_date || item.first_air_date || '').slice(0, 4) || undefined;
  const genres = item.genres?.length
    ? item.genres.slice(0, 3).map((genre) => genre.name)
    : (item.genre_ids || []).slice(0, 3).map((id) => genreNames[id] || 'ภาพยนตร์');

  return {
    id: '',
    tmdb_id: item.id,
    media_type: mediaType,
    title: item.original_title || item.original_name || title,
    title_th: title,
    watch_url: null,
    trailer_url: null,
    provider: null,
    is_active: true,
    notes: null,
    section_slug: sectionSlug,
    status: 'draft',
    poster_url: `${posterBase}${item.poster_path}`,
    backdrop_url: item.backdrop_path ? `${backdropBase}${item.backdrop_path}` : null,
    rating: Number(item.vote_average || 0),
    year,
    language: item.original_language || undefined,
    runtime: item.runtime || item.episode_run_time?.[0] || null,
    genres,
  };
}

function catalogRowToAdminLink(row: TmdbCatalogRow): AdminMovieLink {
  return {
    id: '',
    tmdb_id: row.tmdb_id,
    media_type: row.media_type,
    title: row.title_en || row.title || null,
    title_th: row.title || row.title_en || null,
    watch_url: null,
    trailer_url: null,
    provider: null,
    is_active: true,
    notes: null,
    section_slug: row.source_bucket || 'top-rated',
    status: 'draft',
    poster_url: row.poster_url || null,
    backdrop_url: row.backdrop_url || null,
    rating: Number(row.rating || 0),
    year: row.release_year || undefined,
    language: row.language || undefined,
    runtime: row.runtime || null,
    genres: row.genres || [],
    updated_at: row.updated_at,
  };
}

async function fetchTmdbFallbackCandidates() {
  const collections = await Promise.all([
    tmdbCollection('/movie/popular?language=th-TH&region=TH', 3).then((items) => items.map((item) => toCatalogItem(item, 'movie', 'popular'))),
    tmdbCollection('/movie/top_rated?language=th-TH', 3).then((items) => items.map((item) => toCatalogItem(item, 'movie', 'top-rated'))),
    tmdbCollection('/movie/now_playing?language=th-TH&region=TH', 2).then((items) => items.map((item) => toCatalogItem(item, 'movie', 'now-playing'))),
    tmdbCollection('/movie/upcoming?language=th-TH&region=TH', 2).then((items) => items.map((item) => toCatalogItem(item, 'movie', 'upcoming'))),
    tmdbCollection('/discover/movie?language=th-TH&with_original_language=th&sort_by=popularity.desc', 2).then((items) => items.map((item) => toCatalogItem(item, 'movie', 'thai'))),
    tmdbCollection('/tv/popular?language=th-TH', 2).then((items) => items.map((item) => toCatalogItem(item, 'tv', 'series'))),
  ]);

  const unique = new Map<string, AdminMovieLink>();
  for (const item of collections.flat().filter(Boolean) as AdminMovieLink[]) {
    unique.set(linkKey(item.media_type, item.tmdb_id), item);
  }

  return [...unique.values()];
}

async function fetchCatalogCandidates() {
  try {
    const rows = await supabaseRest<TmdbCatalogRow[]>(
      'tmdb_catalog?select=tmdb_id,media_type,title,title_en,poster_url,backdrop_url,rating,release_year,language,runtime,genres,source_bucket,updated_at&is_active=eq.true&order=sort_score.desc&limit=10000',
      { mode: 'service' }
    );

    const unique = new Map<string, AdminMovieLink>();
    for (const row of rows) {
      if (!row.tmdb_id || !row.media_type || !row.poster_url) continue;
      const item = catalogRowToAdminLink(row);
      unique.set(linkKey(item.media_type, item.tmdb_id), item);
    }

    if (unique.size) return [...unique.values()];
  } catch {
    // If the catalog table is not synced yet, keep the old live TMDB fallback so admin still works.
  }

  return fetchTmdbFallbackCandidates();
}

async function fetchTmdbDetail(item: AdminMovieLink): Promise<AdminMovieLink> {
  if (item.poster_url && item.title_th && item.rating) return item;

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
    const year = (data.release_date || data.first_air_date || '').slice(0, 4) || item.year;

    return {
      ...item,
      title: item.title || data.original_title || data.original_name || title || null,
      title_th: item.title_th || title || item.title || null,
      poster_url: item.poster_url || (data.poster_path ? `${posterBase}${data.poster_path}` : null),
      backdrop_url: item.backdrop_url || (data.backdrop_path ? `${backdropBase}${data.backdrop_path}` : null),
      rating: item.rating || Number(data.vote_average || 0),
      year,
      language: item.language || data.original_language || undefined,
      runtime: item.runtime || data.runtime || data.episode_run_time?.[0] || null,
      genres: item.genres?.length ? item.genres : data.genres?.slice(0, 3).map((genre) => genre.name) || [],
    };
  } catch {
    return item;
  }
}

function mergeSavedIntoCandidate(candidate: AdminMovieLink, saved?: AdminMovieLink): AdminMovieLink {
  if (!saved) return candidate;

  return {
    ...candidate,
    ...saved,
    title: saved.title || candidate.title,
    title_th: saved.title_th || candidate.title_th,
    poster_url: candidate.poster_url || saved.poster_url || null,
    backdrop_url: candidate.backdrop_url || saved.backdrop_url || null,
    rating: candidate.rating || saved.rating || 0,
    year: candidate.year || saved.year,
    language: candidate.language || saved.language,
    runtime: candidate.runtime || saved.runtime || null,
    genres: candidate.genres?.length ? candidate.genres : saved.genres || [],
    section_slug: saved.section_slug || candidate.section_slug,
    status: saved.watch_url ? playableStatus(saved.status || candidate.status, saved.watch_url) : saved.status || candidate.status,
  };
}

async function buildAdminLinks(savedLinks: AdminMovieLink[]) {
  const [catalogCandidates, enrichedSavedLinks] = await Promise.all([
    fetchCatalogCandidates(),
    Promise.all(savedLinks.map((item) => fetchTmdbDetail(item))),
  ]);

  const savedMap = new Map(enrichedSavedLinks.map((item) => [linkKey(item.media_type, item.tmdb_id), item]));
  const merged = new Map<string, AdminMovieLink>();

  for (const candidate of catalogCandidates) {
    merged.set(linkKey(candidate.media_type, candidate.tmdb_id), mergeSavedIntoCandidate(candidate, savedMap.get(linkKey(candidate.media_type, candidate.tmdb_id))));
  }

  for (const saved of enrichedSavedLinks) {
    const key = linkKey(saved.media_type, saved.tmdb_id);
    if (!merged.has(key)) merged.set(key, saved.watch_url ? { ...saved, status: playableStatus(saved.status, saved.watch_url) } : saved);
  }

  return [...merged.values()].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
}

export async function GET(request: Request) {
  const errorResponse = await authError(request);
  if (errorResponse) return errorResponse;

  try {
    const [savedLinks, reports] = await Promise.all([
      supabaseRest<AdminMovieLink[]>(
        'admin_movie_links?select=id,tmdb_id,media_type,title,title_th,watch_url,trailer_url,provider,is_active,notes,section_slug,status,created_at,updated_at&order=updated_at.desc&limit=2000',
        { mode: 'service' }
      ),
      supabaseRest<LinkReport[]>(
        'link_reports?select=id,tmdb_id,media_type,title,title_th,url,reason,detail,status,created_at,updated_at&order=created_at.desc&limit=100',
        { mode: 'service' }
      ),
    ]);

    const links = await buildAdminLinks(savedLinks);
    return NextResponse.json({ ok: true, links, reports });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot load admin dashboard' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const errorResponse = await authError(request);
  if (errorResponse) return errorResponse;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const tmdbId = Number(body?.tmdb_id);
  const mediaType = cleanText(body?.media_type) as MediaType | undefined;
  const requestedStatus = (cleanText(body?.status) || 'published') as MovieStatus;
  const watchUrl = normalizeDrivePreviewUrl(body?.watch_url);
  const status = playableStatus(requestedStatus, watchUrl);

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
  const errorResponse = await authError(request);
  if (errorResponse) return errorResponse;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
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
  if (watchUrl) {
    patch.watch_url = watchUrl;
    const nextStatus = playableStatus((patch.status as MovieStatus | undefined) || 'published', watchUrl);
    patch.status = nextStatus;
    patch.is_active = nextStatus !== 'hidden';
  }
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
