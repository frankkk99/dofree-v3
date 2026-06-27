import { NextResponse } from 'next/server';
import { searchCatalogItems } from '@/lib/catalog-home';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const limit = Number(searchParams.get('limit') || 48);

  const items = await searchCatalogItems(query, category, limit);
  return NextResponse.json({ ok: true, items });
}
