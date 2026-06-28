import { NextResponse } from 'next/server';
import { getCatalogSectionItems, searchCatalogItems } from '@/lib/catalog-home';
import type { MediaType, MovieItem } from '@/lib/tmdb';

export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=240',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=240',
};

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

function uniqueItems(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(`${item.mediaType}-${item.id}`, item);
  return [...map.values()];
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
  if (quality === 'hd') return (item.badges || []).some((badge) => String(badge).toLowerCase().includes('hd'));
  if (quality === 'review') return item.status === 'review';
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

async function searchByAdminCategory(category: string, query: string, limit: number) {
  if (category === 'watch-ready') {
    return searchCatalogItems(query, 'พร้อมดู', limit);
  }

  const sectionItems = await getCatalogSectionItems(category, 24, 0).catch(() => []);
  const searchItems = await searchCatalogItems(query, category, limit).catch(() => []);
  const pool = uniqueItems([...sectionItems, ...searchItems]);
  const filtered = pool.filter((item) => matchesQuery(item, query));

  if (filtered.length || !query.trim()) return filtered.slice(0, Math.max(limit, 24));
  return searchItems;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const limit = Math.max(1, Math.min(Number(searchParams.get('limit') || 48), 96));

  const baseItems = category && knownSlugPattern.test(category)
    ? await searchByAdminCategory(category, query, 96)
    : await searchCatalogItems(query, category, 96);

  const items = applyFilters(uniqueItems(baseItems), searchParams).slice(0, limit);

  return NextResponse.json({ ok: true, items }, { headers: CACHE_HEADERS });
}
