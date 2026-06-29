import { NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin-auth';
import { listSyncJobs } from '@/lib/admin-sync-center';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get('limit') || 20), 1), 50);

  try {
    const jobs = await listSyncJobs(limit);
    return NextResponse.json({ ok: true, jobs });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot load sync jobs' }, { status: 500 });
  }
}
