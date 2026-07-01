import { NextResponse } from 'next/server';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { requireAdminAccess } from '@/lib/admin-auth';
import { adSlotDefinitions, normalizeAdsConfig, publicAdsConfig } from '@/lib/ads-config';
import { readAdsConfig, writeAdsConfig } from '@/lib/ads-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = {
  'Cache-Control': 'no-store, max-age=0, must-revalidate',
  Pragma: 'no-cache',
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'Unknown ads admin error');
}

async function requireAdmin(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) return { response: NextResponse.json({ ok: false, error: auth.error }, { status: auth.status, headers: noStoreHeaders }) };
  return { actor: auth };
}

export async function GET(request: Request) {
  const access = await requireAdmin(request);
  if (access.response) return access.response;

  try {
    const config = await readAdsConfig();
    return NextResponse.json({ ok: true, config, definitions: adSlotDefinitions }, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 500, headers: noStoreHeaders });
  }
}

export async function PATCH(request: Request) {
  const access = await requireAdmin(request);
  if (access.response) return access.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'Invalid ads config payload' }, { status: 400, headers: noStoreHeaders });
  }

  try {
    const before = await readAdsConfig();
    const normalized = normalizeAdsConfig((body as { config?: unknown }).config || body);
    const updatedBy = access.actor.mode === 'session' ? access.actor.user?.id || null : null;
    const config = await writeAdsConfig(normalized, updatedBy);

    await recordAdminAuditLog({
      request,
      actor: access.actor,
      action: 'ads_config.update',
      entityType: 'site_settings',
      entityId: 'owner_ads_config',
      beforeData: publicAdsConfig(before),
      afterData: publicAdsConfig(config),
    });

    return NextResponse.json({ ok: true, config, definitions: adSlotDefinitions }, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 500, headers: noStoreHeaders });
  }
}
