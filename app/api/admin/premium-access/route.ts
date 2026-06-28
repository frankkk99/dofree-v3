import { NextResponse } from 'next/server';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { requireAdminAccess } from '@/lib/admin-auth';
import { normalizePremiumFreeAccessConfig } from '@/lib/premium-access-config';
import { readPremiumFreeAccessConfig, writePremiumFreeAccessConfig } from '@/lib/premium-access-store';

async function requireAdmin(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) return { response: NextResponse.json({ ok: false, error: auth.error }, { status: auth.status }) };
  return { actor: auth };
}

export async function GET(request: Request) {
  const access = await requireAdmin(request);
  if (access.response) return access.response;

  const config = await readPremiumFreeAccessConfig();
  return NextResponse.json({ ok: true, config });
}

export async function PATCH(request: Request) {
  const access = await requireAdmin(request);
  if (access.response) return access.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'Invalid premium access payload' }, { status: 400 });
  }

  const before = await readPremiumFreeAccessConfig();
  const normalized = normalizePremiumFreeAccessConfig((body as { config?: unknown }).config || body);
  const updatedBy = access.actor.mode === 'session' ? access.actor.user?.id || null : null;
  const config = await writePremiumFreeAccessConfig(normalized, updatedBy);

  await recordAdminAuditLog({
    request,
    actor: access.actor,
    action: 'premium_access.update',
    entityType: 'site_settings',
    entityId: 'premium_free_access',
    beforeData: before,
    afterData: config,
  });

  return NextResponse.json({ ok: true, config });
}

