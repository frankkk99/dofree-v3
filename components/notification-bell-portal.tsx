'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type SiteNotification = {
  id: string;
  title: string;
  message: string;
  cta_label?: string | null;
  cta_url?: string | null;
  enabled?: boolean;
  sort_order?: number;
  updated_at?: string;
};

type NotificationPayload = {
  ok?: boolean;
  notifications?: SiteNotification[];
};

const fallback: SiteNotification = {
  id: 'fallback',
  title: 'แจ้งเตือนจากดูดีดี',
  message: 'ติดตามหนังใหม่และรายการแนะนำได้ที่นี่',
  cta_label: 'ดูหน้าแรก',
  cta_url: '/',
};

export function NotificationBellPortal() {
  const [bodyHost, setBodyHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<SiteNotification[]>([fallback]);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setBodyHost(document.body);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch('/api/notifications', { cache: 'no-store' });
        const payload = (await response.json()) as NotificationPayload;
        if (active && Array.isArray(payload.notifications) && payload.notifications.length) setNotifications(payload.notifications);
      } catch {}
    }
    void load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    function onClick(event: MouseEvent) {
      if (!open) return;
      const target = event.target;
      if (target instanceof Node && boxRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  if (!bodyHost) return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="เปิดแจ้งเตือน"
        onClick={() => setOpen((value) => !value)}
        className="fixed right-[70px] top-[18px] z-[120] grid h-10 w-10 place-items-center rounded-none bg-transparent text-white transition hover:opacity-75 md:right-[96px] md:top-[24px] md:h-12 md:w-12"
      >
        <span className="text-[25px] leading-none md:text-[29px]">⌾</span>
        <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#e50914] shadow-[0_0_18px_rgba(229,9,20,0.8)]" />
      </button>

      {open ? (
        <div ref={boxRef} className="fixed right-4 top-[70px] z-[1100] w-[calc(100vw-32px)] max-w-[360px] overflow-hidden rounded-[26px] bg-white/[0.085] p-3 text-white shadow-[0_30px_110px_rgba(0,0,0,0.92),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-26px_70px_rgba(0,0,0,0.36)] backdrop-blur-3xl md:right-8 md:top-[92px]">
          <div className="rounded-[22px] bg-black/38 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#e50914]">Notifications</p>
                <h3 className="mt-1 text-2xl font-black tracking-[-0.06em]">แจ้งเตือน</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.08] text-xl font-black text-white/80 hover:bg-[#e50914]">×</button>
            </div>
            <div className="mt-4 grid gap-2">
              {notifications.map((item) => (
                <article key={item.id} className="rounded-[18px] bg-white/[0.065] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <h4 className="text-sm font-black text-white/92">{item.title}</h4>
                  <p className="mt-1 text-xs font-semibold leading-5 text-white/54">{item.message}</p>
                  {item.cta_label && item.cta_url ? <a href={item.cta_url} className="mt-3 inline-flex h-9 items-center rounded-xl bg-[#e50914] px-4 text-[11px] font-black text-white shadow-glow">{item.cta_label}</a> : null}
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>,
    bodyHost,
  );
}
