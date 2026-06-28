import { NextResponse } from 'next/server';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { requireAdminAccess } from '@/lib/admin-auth';
import { supabaseRest } from '@/lib/supabase-rest';

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  cta_label?: string | null;
  cta_url?: string | null;
  enabled: boolean;
  sort_order: number;
  updated_at?: string;
};

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

async function requireAdmin(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) return { response: NextResponse.json({ ok: false, error: auth.error }, { status: auth.status }) };
  return { actor: auth };
}

export async function GET(request: Request) {
  const access = await requireAdmin(request);
  if (access.response) return access.response;

  const rows = await supabaseRest<NotificationRow[]>(
    'site_notifications?select=id,title,message,cta_label,cta_url,enabled,sort_order,updated_at&order=sort_order.asc,updated_at.desc&limit=20',
    { mode: 'service' },
  ).catch(() => []);

  return NextResponse.json({ ok: true, notifications: rows });
}

export async function PATCH(request: Request) {
  const access = await requireAdmin(request);
  if (access.response) return access.response;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = cleanText(body?.id) || 'main';
  const title = cleanText(body?.title) || 'แจ้งเตือน';
  const message = cleanText(body?.message) || 'ติดตามข่าวสารและหนังใหม่ได้ที่นี่';
  const ctaLabel = cleanText(body?.cta_label) || null;
  const ctaUrl = cleanText(body?.cta_url) || null;
  const enabled = typeof body?.enabled === 'boolean' ? body.enabled : true;
  const sortOrder = Number(body?.sort_order || 0);

  const record = {
    id,
    title,
    message,
    cta_label: ctaLabel,
    cta_url: ctaUrl,
    enabled,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    updated_at: new Date().toISOString(),
  };

  const rows = await supabaseRest<NotificationRow[]>(
    'site_notifications?on_conflict=id',
    { method: 'POST', mode: 'service', prefer: 'resolution=merge-duplicates,return=representation', body: [record] },
  );

  await recordAdminAuditLog({ request, actor: access.actor, action: 'notification.upsert', entityType: 'site_notifications', entityId: id, afterData: record });
  return NextResponse.json({ ok: true, notification: rows?.[0] || record });
}
