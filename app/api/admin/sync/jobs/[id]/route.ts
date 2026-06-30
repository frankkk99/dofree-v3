import { NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin-auth';
import { getSyncJob } from '@/lib/admin-sync-center';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const { id } = await context.params;
    const job = await getSyncJob(id);
    if (!job) return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 });
    return NextResponse.json({ ok: true, job });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot load sync job' }, { status: 500 });
  }
}
