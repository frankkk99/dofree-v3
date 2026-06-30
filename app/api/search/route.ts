import { NextResponse } from 'next/server';
import { supabaseRest } from '@/lib/supabase-rest';
import type { MediaType, MovieItem } from '@/lib/tmdb';

export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=240',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=240',
};

const fallbackImage = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80';
const knownSlugPattern = /^[a-z0-9-]+$/;
const countryLanguage: Record<string, string[]> = {
  th: ['th'],
  kr: ['ko'],
  jp: ['ja'],
  cn: ['zh', 'cn'],
  us: ['en'],
  uk: ['en'],
  in: ['hi', 'ta', 'te', 'ml'],
};

type CatalogRow = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  title_en?: string | null;
  overview?: string | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  rating?: number | string | null;
  vote_count?: number | string | null;
  popularity?: number | string | null;
  release_year?: string | null;
  release_date?: string | null;
  genres?: string[] | null;
  language?: string | null;
  runtime?: number | null;
  source_bucket?: string | null;
  sort_score?: number | string | null;
  is_active?: boolean;
};

type WatchLinkRecord = {
  tmdb_id: number;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
};

function uniqueItems(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(`${item.mediaType}-${item.id}`, item);
  return [...map.values()];
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

function watchKey(mediaType: MediaType, id: number) {
  return `${mediaType}-${id}`;
}

function badges(item: Pick<MovieItem, 'rating' | 'language' | 'isWatchReady'>) {
  const list: string[] = [];
  if (item.isWatchReady) list.push('พร้อมดู', 'HD');
  if (item.rating >= 8) list.push('8+');
  if (item.rating >= 6.5) list.push('6.5+');
  if (item.language === 'th') list.push('พากย์ไทย');
  return list.slice(0, 3);
}

function rowToMovie(row: CatalogRow, links: Map<string, WatchLinkRecord>): MovieItem {
  const rating = Number(row.rating || 0);
  const link = links.get(watchKey(row.media_type, Number(row.tmdb_id)));
  const watchUrl = normalizeDrivePreviewUrl(link?.watch_url);
  const trailerUrl = normalizeDrivePreviewUrl(link?.trailer_url);
  const title = link?.title || row.title_en || row.title || `รายการ ${row.tmdb_id}`;
  const base: MovieItem = {
    id: Number(row.tmdb_id),
    mediaType: row.media_type,
    title,
    titleEn: link?.title || row.title_en || row.title || undefined,
    overview: row.overview || 'ค้นพบเรื่องราวใหม่ พร้อมข้อมูลภาพยนตร์ ตัวอย่าง นักแสดง และสถานะการรับชมที่ชัดเจน',
    posterUrl: row.poster_url || fallbackImage,
    backdropUrl: row.backdrop_url || row.poster_url || fallbackImage,
    rating,
    year: row.release_year || (row.release_date ? row.release_date.slice(0, 4) : 'ไม่ระบุ'),
    genres: row.genres || [],
    runtime: row.runtime || undefined,
    language: row.language || undefined,
    status: watchUrl ? 'published' : rating >= 8 ? 'review' : 'draft',
    isWatchReady: Boolean(watchUrl),
    watchUrl: watchUrl ? `/watch/${row.media_type}/${row.tmdb_id}` : undefined,
    trailerUrl,
    label: watchUrl ? 'พร้อมดู' : rating >= 8 ? '8+' : '6.5+',
  };

  return { ...base, badges: badges(base) };
}

function itemText(item: MovieItem) {
  return [
    item.title,
    item.titleEn,
    item.overview,
    item.year,
    item.language,
    item.mediaType,
    item.status,
    item.label,
    ...(item.genres || []),
    ...(item.badges || []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function matchesQuery(item: MovieItem, query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 4);
  if (!terms.length) return true;
  const text = itemText(item);
  return terms.every((term) => text.includes(term));
}

function itemYear(item: MovieItem) {
  const year = Number(item.year || 0);
  return Number.isFinite(year) ? year : 0;
}

function matchesYear(item: MovieItem, yearFilter: string) {
  if (!yearFilter) return true;
  const year = itemYear(item);
  if (!year) return false;
  if (/^\d{4}$/.test(yearFilter)) return String(year) === yearFilter;
  if (yearFilter === '2020s') return year >= 2020 && year <= 2029;
  if (yearFilter === '2010s') return year >= 2010 && year <= 2019;
  if (yearFilter === 'before-2010') return year < 2010;
  return true;
}

function matchesLanguage(item: MovieItem, language: string) {
  if (!language) return true;
  return String(item.language || '').toLowerCase() === language;
}

function matchesCountry(item: MovieItem, country: string) {
  if (!country) return true;
  const accepted = countryLanguage[country] || [country];
  return accepted.includes(String(item.language || '').toLowerCase());
}

function matchesQuality(item: MovieItem, quality: string) {
  if (!quality) return true;
  if (quality === 'ready') return Boolean(item.isWatchReady || item.watchUrl || item.status === 'published');
  if (quality === 'hd') return Boolean(item.isWatchReady || item.watchUrl);
  if (quality === 'review') return item.status === 'review' || !item.isWatchReady;
  return true;
}

function applyFilters(items: MovieItem[], filters: URLSearchParams) {
  const mediaType = filters.get('type') || '';
  const country = filters.get('country') || '';
  const language = filters.get('language') || '';
  const quality = filters.get('quality') || '';
  const year = filters.get('year') || '';
  const sort = filters.get('sort') || 'rating-desc';

  const filtered = items.filter((item) => {
    if (mediaType && item.mediaType !== mediaType) return false;
    if (!matchesCountry(item, country)) return false;
    if (!matchesLanguage(item, language)) return false;
    if (!matchesQuality(item, quality)) return false;
    if (!matchesYear(item, year)) return false;
    return true;
  });

  return filtered.sort((a, b) => {
    if (sort === 'rating-asc') return a.rating - b.rating || itemYear(b) - itemYear(a);
    if (sort === 'year-desc') return itemYear(b) - itemYear(a) || b.rating - a.rating;
    if (sort === 'year-asc') return itemYear(a) - itemYear(b) || b.rating - a.rating;
    return b.rating - a.rating || itemYear(b) - itemYear(a);
  });
}

function searchTerms(query: string) {
  return query.trim().replace(/[*,()]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 4);
}

function termFilter(query: string) {
  const terms = searchTerms(query);
  if (!terms.length) return '';
  return `&or=(${terms.map((term) => {
    const value = encodeURIComponent(`*${term}*`);
    return `title.ilike.${value},title_en.ilike.${value},overview.ilike.${value}`;
  }).join(',')})`;
}

async function fetchWatchLinks(rows: CatalogRow[]) {
  const ids = [...new Set(rows.map((row) => Number(row.tmdb_id)).filter(Boolean))];
  if (!ids.length) return new Map<string, WatchLinkRecord>();

  const linkRows = await supabaseRest<WatchLinkRecord[]>(
    `admin_movie_links?is_active=eq.true&tmdb_id=in.(${ids.join(',')})&select=tmdb_id,media_type,title,title_th,watch_url,trailer_url`,
    { mode: 'service', next: { revalidate: 60 } },
  ).catch(() => []);

  const map = new Map<string, WatchLinkRecord>();
  for (const link of linkRows || []) {
    if (!link.tmdb_id || !link.media_type) continue;
    map.set(watchKey(link.media_type, Number(link.tmdb_id)), link);
  }
  return map;
}

async function rowsForSearch(query: string, category: string, limit: number, offset: number) {
  const isKnownCategory = category && knownSlugPattern.test(category);
  const bucketFilter = isKnownCategory && category !== 'watch-ready' ? `&source_bucket=eq.${encodeURIComponent(category)}` : '';
  const fetchLimit = Math.min((offset + limit) * 3, 600);
  const rows = await supabaseRest<CatalogRow[]>(
    `tmdb_catalog?select=tmdb_id,media_type,title,title_en,overview,poster_url,backdrop_url,rating,vote_count,popularity,release_year,release_date,genres,language,runtime,source_bucket,sort_score,is_active&is_active=eq.true${bucketFilter}${termFilter(query)}&order=sort_score.desc.nullslast,rating.desc&limit=${fetchLimit}`,
    { mode: 'service', next: { revalidate: 120 } },
  ).catch(() => []);

  if (category !== 'watch-ready') return rows || [];

  const links = await supabaseRest<WatchLinkRecord[]>(
    `admin_movie_links?is_active=eq.true&watch_url=not.is.null&select=tmdb_id,media_type,title,title_th,watch_url,trailer_url&order=updated_at.desc.nullslast&limit=${fetchLimit}`,
    { mode: 'service', next: { revalidate: 120 } },
  ).catch(() => []);
  const ids = [...new Set((links || []).map((link) => Number(link.tmdb_id)).filter(Boolean))];
  if (!ids.length) return [];
  return supabaseRest<CatalogRow[]>(
    `tmdb_catalog?select=tmdb_id,media_type,title,title_en,overview,poster_url,backdrop_url,rating,vote_count,popularity,release_year,release_date,genres,language,runtime,source_bucket,sort_score,is_active&is_active=eq.true&tmdb_id=in.(${ids.join(',')})&limit=${Math.min(limit * 2, 600)}`,
    { mode: 'service', next: { revalidate: 120 } },
  ).catch(() => []);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const limit = Math.max(1, Math.min(Number(searchParams.get('limit') || 24), 48));
  const offset = Math.max(0, Math.min(Number(searchParams.get('offset') || 0), 600));

  const rows = await rowsForSearch(query, category, limit, offset);
  const links = await fetchWatchLinks(rows);
  const baseItems = rows.map((row) => rowToMovie(row, links)).filter((item) => matchesQuery(item, query));
  const filteredItems = applyFilters(uniqueItems(baseItems), searchParams);
  const items = filteredItems.slice(offset, offset + limit);
  const hasMore = filteredItems.length > offset + items.length;

  return NextResponse.json({ ok: true, items, total: filteredItems.length, hasMore, offset }, { headers: CACHE_HEADERS });
}
