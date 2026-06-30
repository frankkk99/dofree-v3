import { NextResponse } from 'next/server';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { requireAdminAccess } from '@/lib/admin-auth';
import {
  buildNotificationRecord,
  cleanText,
  notificationSelect,
  notificationStatus,
  type NotificationRow,
} from '@/lib/admin-notifications';
import { supabaseRest } from '@/lib/supabase-rest';

export const dynamic = 'force-dynamic';

async function requireAdmin(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) return { response: NextResponse.json({ ok: false, error: auth.error }, { status: auth.status }) };
  return { actor: auth };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function matchesQuery(row: NotificationRow, q: string) {
  if (!q) return true;
  const haystack = [row.title, row.message, row.detail, row.cta_label, row.cta_url, row.type]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q.toLowerCase());
}

export async function GET(request: Request) {
  const access = await requireAdmin(request);
  if (access.response) return access.response;

  const params = new URL(request.url).searchParams;
  const status = cleanText(params.get('status')) || 'all';
  const type = cleanText(params.get('type'));
  const q = cleanText(params.get('q'));
  const limit = clamp(Number(params.get('limit') || 50) || 50, 1, 100);
  const offset = Math.max(0, Number(params.get('offset') || 0) || 0);

  const rows = await supabaseRest<NotificationRow[]>(
    `site_notifications?select=${notificationSelect}&order=updated_at.desc&limit=500`,
    { mode: 'service' },
  ).catch(() => []);

  const filtered = rows
    .filter((row) => (type ? row.type === type : true))
    .filter((row) => (status === 'all' ? true : notificationStatus(row) === status))
    .filter((row) => matchesQuery(row, q))
    .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());

  return NextResponse.json({
    ok: true,
    notifications: filtered.slice(offset, offset + limit),
    total: filtered.length,
    limit,
    offset,
  });
}

export async function POST(request: Request) {
  const access = await requireAdmin(request);
  if (access.response) return access.response;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const built = buildNotificationRecord(body, access.actor.mode === 'session' ? access.actor.user?.id : null);
  if (built.error || !built.record) {
    return NextResponse.json({ ok: false, error: built.error || 'Invalid notification' }, { status: 400 });
  }

  const { id: _id, ...record } = built.record;
  const rows = await supabaseRest<NotificationRow[]>(
    'site_notifications',
    { method: 'POST', mode: 'service', prefer: 'return=representation', body: [record] },
  );

  const notification = rows?.[0] || record;
  await recordAdminAuditLog({
    request,
    actor: access.actor,
    action: 'notification.create',
    entityType: 'site_notifications',
    entityId: rows?.[0]?.id || 'new',
    afterData: notification,
  });

  return NextResponse.json({ ok: true, notification }, { status: 201 });
}

export async function PATCH(request: Request) {
  const access = await requireAdmin(request);
  if (access.response) return access.response;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = cleanText(body?.id);
  if (!id) return NextResponse.json({ ok: false, error: 'Missing notification id' }, { status: 400 });

  const built = buildNotificationRecord(body);
  if (built.error || !built.record) {
    return NextResponse.json({ ok: false, error: built.error || 'Invalid notification' }, { status: 400 });
  }

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
    afterData: notification,
  });

  return NextResponse.json({ ok: true, notification });
}
