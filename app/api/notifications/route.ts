import { NextResponse } from 'next/server';
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

const fallback: NotificationRow = {
  id: 'fallback',
  title: 'แจ้งเตือนจากดูดีดี',
  message: 'ติดตามหนังใหม่และรายการแนะนำได้ที่นี่',
  cta_label: 'ดูหน้าแรก',
  cta_url: '/',
  enabled: true,
  sort_order: 0,
};

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await supabaseRest<NotificationRow[]>(
    'site_notifications?select=id,title,message,cta_label,cta_url,enabled,sort_order,updated_at&enabled=eq.true&order=sort_order.asc,updated_at.desc&limit=5',
    { mode: 'service', next: { revalidate: 60 } },
  ).catch(() => [fallback]);

  return NextResponse.json({ ok: true, notifications: rows?.length ? rows : [fallback] });
}
