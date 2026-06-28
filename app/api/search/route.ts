import { NextResponse } from 'next/server';
import { getCatalogSectionItems, searchCatalogItems } from '@/lib/catalog-home';
import type { MovieItem } from '@/lib/tmdb';

export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=240',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=240',
};

const knownSlugPattern = /^[a-z0-9-]+$/;

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

async function searchByAdminCategory(category: string, query: string, limit: number) {
  if (category === 'watch-ready') {
    return searchCatalogItems(query, 'พร้อมดู', limit);
  }

  const poolLimit = query.trim() ? Math.min(Math.max(limit * 4, 48), 120) : limit;
  const items = await getCatalogSectionItems(category, poolLimit, 0);
  const filtered = items.filter((item) => matchesQuery(item, query));

  if (filtered.length || !query.trim()) return filtered.slice(0, limit);

  return searchCatalogItems(query, category, limit);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const limit = Math.max(1, Math.min(Number(searchParams.get('limit') || 48), 96));

  const items = category && knownSlugPattern.test(category)
    ? await searchByAdminCategory(category, query, limit)
    : await searchCatalogItems(query, category, limit);

  return NextResponse.json({ ok: true, items }, { headers: CACHE_HEADERS });
}
