import { NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin-auth';
import { listAdminAuditLogs } from '@/lib/admin-audit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') || 80);

  try {
    const logs = await listAdminAuditLogs(limit);
    return NextResponse.json({ ok: true, logs });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot load admin audit logs' }, { status: 500 });
  }
}
