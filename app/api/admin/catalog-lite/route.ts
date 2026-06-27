import { NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin-auth';
import {
  filterAdminCatalogItems,
  getAdminCatalogFilterOptions,
  loadAdminCatalogItems,
  parseAdminCatalogFilters,
  sortAdminCatalogItems,
} from '@/lib/admin-catalog-query';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const params = new URL(request.url).searchParams;
  const filters = parseAdminCatalogFilters(params);
  const limit = Math.min(Math.max(Number(params.get('limit') || 240), 24), 1000);
  const offset = Math.max(Number(params.get('offset') || 0), 0);

  try {
    const allItems = await loadAdminCatalogItems(filters.view);
    const matched = sortAdminCatalogItems(filterAdminCatalogItems(allItems, filters), filters.sort);
    const links = matched.slice(offset, offset + limit);

    return NextResponse.json({
      ok: true,
      links,
      reports: [],
      options: getAdminCatalogFilterOptions(allItems),
      meta: {
        ...filters,
        limit,
        offset,
        returned: links.length,
        matched: matched.length,
        total: allItems.length,
        hasMore: matched.length > offset + limit,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot load catalog' }, { status: 500 });
  }
}
