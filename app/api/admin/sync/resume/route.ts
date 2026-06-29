import { NextResponse } from 'next/server';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { requireAdminAccess } from '@/lib/admin-auth';
import { resumeSyncJob } from '@/lib/admin-sync-center';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function readBody(request: Request) {
  const text = await request.text().catch(() => '');
  if (!text.trim()) return {};
  return JSON.parse(text) as { jobId?: string };
}

export async function POST(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const body = await readBody(request);
    if (!body.jobId) return NextResponse.json({ ok: false, error: 'Missing jobId' }, { status: 400 });
    const result = await resumeSyncJob(body.jobId);

    await recordAdminAuditLog({
      request,
      actor: auth,
      action: 'admin_sync.resume',
      entityType: 'admin_sync_jobs',
      entityId: body.jobId,
      afterData: result,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot resume sync job' }, { status: 500 });
  }
}
