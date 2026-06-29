import { NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin-auth';
import { getCatalogSyncStatus } from '@/lib/admin-sync-center';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const status = await getCatalogSyncStatus();
    return NextResponse.json({ ok: true, ...status });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot load sync status' }, { status: 500 });
  }
}
