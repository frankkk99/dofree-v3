import { NextResponse } from 'next/server';
import { getCatalogSectionItems, HOME_SECTION_LOAD_LIMIT } from '@/lib/catalog-home';

export const dynamic = 'force-dynamic';
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || 'top-rated';
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || HOME_SECTION_LOAD_LIMIT) || HOME_SECTION_LOAD_LIMIT, 1), 24);
  const offset = Math.max(Number(searchParams.get('offset') || 0) || 0, 0);

  const items = await getCatalogSectionItems(slug, limit, offset);
  return NextResponse.json({
    ok: true,
    slug,
    limit,
    offset,
    items,
    hasMore: items.length >= limit,
  }, { headers: CACHE_HEADERS });
}
