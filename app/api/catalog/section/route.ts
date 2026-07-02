import { NextResponse } from 'next/server';
import { HOME_SECTION_LOAD_LIMIT } from '@/lib/catalog-home';
import { getManagedCatalogSectionItems } from '@/lib/catalog-managed-sections';
import { TMDB_RELEASE_SECTION_LIMIT } from '@/lib/tmdb-release-window';

export const dynamic = 'force-dynamic';
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || 'top-rated';
  const maxLimit = slug === 'coming-soon' ? TMDB_RELEASE_SECTION_LIMIT : 24;
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || HOME_SECTION_LOAD_LIMIT) || HOME_SECTION_LOAD_LIMIT, 1), maxLimit);
  const offset = Math.max(Number(searchParams.get('offset') || 0) || 0, 0);

  const items = await getManagedCatalogSectionItems(slug, limit, offset);
  return NextResponse.json({
    ok: true,
    slug,
    limit,
    offset,
    items,
    hasMore: items.length >= limit,
  }, { headers: CACHE_HEADERS });
}
