import { NextResponse } from 'next/server';
import { getAdminRoleLabel } from '@/lib/admin-access-control';
import { requireOwnerAccess } from '@/lib/admin-auth';
import { listAccessControlTeam } from '@/lib/admin-access-control-store';

export async function GET(request: Request) {
  const access = await requireOwnerAccess(request);
  if (access.ok === false) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  const team = (await listAccessControlTeam()).map((member) => ({
    ...member,
    roleLabel: getAdminRoleLabel(member.role),
  }));
  return NextResponse.json({ ok: true, team });
}
