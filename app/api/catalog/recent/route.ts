import { NextResponse } from 'next/server';
import { supabaseRest } from '@/lib/supabase-rest';
import type { MediaType, MovieItem } from '@/lib/tmdb';

type CatalogRow = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  title_en?: string | null;
  overview?: string | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  rating?: number | string | null;
  release_year?: string | null;
  release_date?: string | null;
  genres?: string[] | null;
  language?: string | null;
  runtime?: number | null;
};

type LinkRow = {
  tmdb_id: number;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
};

export const dynamic = 'force-dynamic';
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};
const ERROR_HEADERS = { 'Cache-Control': 'no-store, max-age=0' };
const PUBLIC_RECENT_REVALIDATE = 300;

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function key(mediaType: MediaType, id: number) {
  return `${mediaType}-${id}`;
}

function publicWatchUrl(mediaType: MediaType, id: number) {
  return `/watch/${mediaType}/${id}`;
}

function rowIds(rows: Pick<CatalogRow, 'tmdb_id'>[]) {
  return [...new Set(rows.map((row) => Number(row.tmdb_id)).filter((id) => Number.isInteger(id) && id > 0))];
}

function normalizeDrivePreviewUrl(value?: string | null) {
  const url = value?.trim();
  if (!url) return undefined;
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (url.includes('drive.google.com') && openMatch?.[1]) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  return url;
}

function badges(isUpcoming: boolean, isReady: boolean, rating: number) {
  const values = [isUpcoming ? 'กำลังจะเข้า' : 'เข้าใหม่'];
  if (isReady) values.push('พร้อมดู');
  if (rating >= 8) values.push('8+');
  else values.push('HD');
  return values.slice(0, 3);
}

function rowToItem(row: CatalogRow, link: LinkRow | undefined, today: string): MovieItem & { releaseDate?: string } {
  const rating = Number(row.rating || 0);
  const releaseDate = row.release_date || undefined;
  const isUpcoming = Boolean(releaseDate && releaseDate > today);
  const hasWatchUrl = Boolean(normalizeDrivePreviewUrl(link?.watch_url));
  const item: MovieItem & { releaseDate?: string } = {
    id: row.tmdb_id,
    mediaType: row.media_type,
    title: link?.title_th || row.title || row.title_en || `รายการ ${row.tmdb_id}`,
    titleEn: link?.title || row.title_en || undefined,
    overview: row.overview || undefined,
    posterUrl: row.poster_url || row.backdrop_url || '',
    backdropUrl: row.backdrop_url || row.poster_url || '',
    rating,
    year: row.release_year || (releaseDate ? releaseDate.slice(0, 4) : 'ไม่ระบุ'),
    genres: row.genres || [],
    runtime: row.runtime || undefined,
    language: row.language || undefined,
    status: hasWatchUrl ? 'published' : 'review',
    isWatchReady: hasWatchUrl,
    watchUrl: hasWatchUrl ? publicWatchUrl(row.media_type, row.tmdb_id) : undefined,
    trailerUrl: normalizeDrivePreviewUrl(link?.trailer_url),
    label: isUpcoming ? 'กำลังจะเข้า' : 'เข้าใหม่',
    badges: badges(isUpcoming, hasWatchUrl, rating),
    releaseDate,
  };
  return item;
}

export async function GET() {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - 2);
  const end = new Date(now);
  end.setMonth(end.getMonth() + 8);
  const today = isoDate(now);

  try {
    const rows = await supabaseRest<CatalogRow[]>(
      `tmdb_catalog?select=tmdb_id,media_type,title,title_en,overview,poster_url,backdrop_url,rating,release_year,release_date,genres,language,runtime&is_active=eq.true&release_date=gte.${isoDate(start)}&release_date=lte.${isoDate(end)}&order=release_date.asc&limit=160`,
      { mode: 'service', next: { revalidate: PUBLIC_RECENT_REVALIDATE } }
    );
    const ids = rowIds(rows || []);
    const idFilter = ids.length ? `&tmdb_id=in.(${ids.join(',')})` : '';
    const links = await supabaseRest<LinkRow[]>(
      `admin_movie_links?is_active=eq.true${idFilter}&select=tmdb_id,media_type,title,title_th,watch_url,trailer_url&limit=${Math.max(ids.length, 1)}`,
      { mode: 'service', next: { revalidate: PUBLIC_RECENT_REVALIDATE } }
    ).catch(() => []);

    const linkMap = new Map((links || []).map((link) => [key(link.media_type, link.tmdb_id), link]));
    const items = (rows || [])
      .filter((row) => row.poster_url || row.backdrop_url)
      .sort((a, b) => {
        const ad = a.release_date || '';
        const bd = b.release_date || '';
        const au = ad > today;
        const bu = bd > today;
        if (au && bu) return ad.localeCompare(bd);
        if (au !== bu) return au ? -1 : 1;
        return bd.localeCompare(ad);
      })
      .map((row) => rowToItem(row, linkMap.get(key(row.media_type, row.tmdb_id)), today))
      .slice(0, 36);

    return NextResponse.json({ ok: true, items, window: { from: isoDate(start), to: isoDate(end), today } }, { headers: CACHE_HEADERS });
  } catch (error) {
    return NextResponse.json({ ok: false, items: [], error: error instanceof Error ? error.message : 'Cannot load recent catalog' }, { headers: ERROR_HEADERS });
  }
}
