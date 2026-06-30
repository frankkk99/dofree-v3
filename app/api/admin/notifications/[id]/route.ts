import { NextResponse } from 'next/server';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { requireAdminAccess } from '@/lib/admin-auth';
import { buildNotificationRecord, notificationSelect, type NotificationRow } from '@/lib/admin-notifications';
import { supabaseRest } from '@/lib/supabase-rest';

export const dynamic = 'force-dynamic';

async function requireAdmin(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) return { response: NextResponse.json({ ok: false, error: auth.error }, { status: auth.status }) };
  return { actor: auth };
}

async function fetchNotification(id: string) {
  const rows = await supabaseRest<NotificationRow[]>(
    `site_notifications?id=eq.${encodeURIComponent(id)}&select=${notificationSelect}&limit=1`,
    { mode: 'service' },
  ).catch(() => []);
  return rows[0] || null;
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin(request);
  if (access.response) return access.response;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ ok: false, error: 'Missing notification id' }, { status: 400 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const built = buildNotificationRecord(body);
  if (built.error || !built.record) {
    return NextResponse.json({ ok: false, error: built.error || 'Invalid notification' }, { status: 400 });
  }

  const before = await fetchNotification(id);
  const rows = await supabaseRest<NotificationRow[]>(
    `site_notifications?id=eq.${encodeURIComponent(id)}`,
    { method: 'PATCH', mode: 'service', prefer: 'return=representation', body: built.record },
  );

  const notification = rows?.[0] || { ...built.record, id };
  await recordAdminAuditLog({
    request,
    actor: access.actor,
    action: 'notification.update',
    entityType: 'site_notifications',
    entityId: id,
    beforeData: before,
    afterData: notification,
  });

  return NextResponse.json({ ok: true, notification });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin(request);
  if (access.response) return access.response;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ ok: false, error: 'Missing notification id' }, { status: 400 });

  const before = await fetchNotification(id);
  const rows = await supabaseRest<NotificationRow[]>(
    `site_notifications?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      mode: 'service',
      prefer: 'return=representation',
      body: { enabled: false, updated_at: new Date().toISOString() },
    },
  );

  const notification = rows?.[0] || { id, enabled: false };
  await recordAdminAuditLog({
    request,
    actor: access.actor,
    action: 'notification.disable',
    entityType: 'site_notifications',
    entityId: id,
    beforeData: before,
    afterData: notification,
  });

  return NextResponse.json({ ok: true, notification });
}
