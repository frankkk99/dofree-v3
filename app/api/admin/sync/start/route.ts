import { NextResponse } from 'next/server';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { requireAdminAccess } from '@/lib/admin-auth';
import { startSyncJob } from '@/lib/admin-sync-center';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function readBody(request: Request) {
  const text = await request.text().catch(() => '');
  if (!text.trim()) return {};
  return JSON.parse(text) as { profileId?: string; filters?: Record<string, unknown>; safety?: Record<string, unknown> };
}

export async function POST(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const body = await readBody(request);
    const result = await startSyncJob(body.profileId || 'popular-movies', body.filters || {}, body.safety || {}, auth.user?.id || null);

    await recordAdminAuditLog({
      request,
      actor: auth,
      action: 'admin_sync.start',
      entityType: 'admin_sync_jobs',
      entityId: result.jobId,
      afterData: {
        profileId: body.profileId || 'popular-movies',
        dryRun: body.safety?.dryRun !== false,
        result: result.result,
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot start sync job' }, { status: 500 });
  }
}
