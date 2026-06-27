import { requireAdminAccess } from '@/lib/admin-auth';
import {
  adminCatalogExportRow,
  adminExportHeader,
  csvLine,
  filterAdminCatalogItems,
  loadAdminCatalogItems,
  parseAdminCatalogFilters,
  sortAdminCatalogItems,
} from '@/lib/admin-catalog-query';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function fileDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) {
    return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const params = url.searchParams;
  const filters = parseAdminCatalogFilters(params);
  const exportMode = params.get('exportMode') || 'filtered';
  const maxRows = Math.min(Math.max(Number(params.get('limit') || 50000), 1), 50000);

  const allItems = await loadAdminCatalogItems(filters.view);
  const rows = exportMode === 'all'
    ? sortAdminCatalogItems(allItems, filters.sort)
    : sortAdminCatalogItems(filterAdminCatalogItems(allItems, filters), filters.sort);

  const body = rows.slice(0, maxRows).map((item, index) => csvLine(adminCatalogExportRow(item, index)));
  const csv = `\ufeff${csvLine(adminExportHeader)}\n${body.join('\n')}`;
  const suffix = exportMode === 'all' ? 'all-details' : 'filtered-details';

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="dofree-catalog-${suffix}-${fileDate()}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
