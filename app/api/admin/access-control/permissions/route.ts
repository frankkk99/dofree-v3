import { NextResponse } from 'next/server';
import { requireOwnerAccess } from '@/lib/admin-auth';
import { getAccessControlSnapshot } from '@/lib/admin-access-control-store';

export async function GET(request: Request) {
  const access = await requireOwnerAccess(request);
  if (access.ok === false) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  const snapshot = await getAccessControlSnapshot();
  return NextResponse.json({
    ok: true,
    modules: snapshot.modules,
    permissions: snapshot.permissions,
    rolePermissions: snapshot.rolePermissions,
  });
}
