import { NextResponse } from 'next/server';
import { requireOwnerAccess } from '@/lib/admin-auth';
import { saveUserPermissionOverride } from '@/lib/admin-access-control-store';

export async function PUT(request: Request) {
  const access = await requireOwnerAccess(request);
  if (access.ok === false) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });

  try {
    const body = await request.json();
    await saveUserPermissionOverride({
      userId: body.userId,
      permissionKey: body.permissionKey,
      allowed: body.allowed,
      requiresApproval: body.requiresApproval,
      canBulk: body.canBulk,
      note: body.note,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot save user permission override' }, { status: 400 });
  }
}
