import { NextResponse } from 'next/server';
import { searchCatalogItems } from '@/lib/catalog-home';

export const dynamic = 'force-dynamic';
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=240',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=240',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const limit = Number(searchParams.get('limit') || 48);

  const items = await searchCatalogItems(query, category, limit);
  return NextResponse.json({ ok: true, items }, { headers: CACHE_HEADERS });
}
