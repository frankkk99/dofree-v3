import { NextResponse } from 'next/server';
import { requireOwnerAccess } from '@/lib/admin-auth';
import { saveRolePermission } from '@/lib/admin-access-control-store';

export async function PUT(request: Request) {
  const access = await requireOwnerAccess(request);
  if (access.ok === false) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });

  try {
    const body = await request.json();
    await saveRolePermission({
      roleKey: body.roleKey,
      permissionKey: body.permissionKey,
      allowed: Boolean(body.allowed),
      requiresApproval: Boolean(body.requiresApproval),
      canBulk: Boolean(body.canBulk),
      riskLevel: body.riskLevel,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot save role permission' }, { status: 400 });
  }
}
