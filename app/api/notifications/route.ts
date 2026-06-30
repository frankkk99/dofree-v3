import { NextResponse } from 'next/server';
import { isVisibleNotification, publicNotificationSelect, sortNotifications, type NotificationRow } from '@/lib/admin-notifications';
import { supabaseRest } from '@/lib/supabase-rest';

const fallback: NotificationRow = {
  id: 'fallback',
  title: 'Welcome to dofree',
  message: 'Follow recommendations, new releases, and important announcements from this bell.',
  type: 'general',
  audience: 'all',
  priority: 0,
  cta_label: 'Home',
  cta_url: '/',
  enabled: true,
  pinned: false,
  sort_order: 0,
  updated_at: new Date(0).toISOString(),
};

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await supabaseRest<NotificationRow[]>(
      `site_notifications?select=${publicNotificationSelect}&enabled=eq.true&order=pinned.desc,priority.desc,sort_order.asc,publish_at.desc.nullslast,updated_at.desc&limit=50`,
      { mode: 'service', next: { revalidate: 60 } },
    );

    const notifications = (rows || [])
      .filter((row) => isVisibleNotification(row))
      .sort(sortNotifications)
      .slice(0, 10);

    return NextResponse.json({ ok: true, notifications: notifications.length ? notifications : [fallback] });
  } catch {
    return NextResponse.json({ ok: true, notifications: [fallback] });
  }
}
