'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePremiumAccessSnapshot } from '@/lib/premium-access-client';

type SiteNotification = {
  id: string;
  title: string;
  message: string;
  detail?: string | null;
  type?: string | null;
  priority?: number | null;
  audience?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  secondary_cta_label?: string | null;
  secondary_cta_url?: string | null;
  image_url?: string | null;
  related_media_type?: 'movie' | 'tv' | string | null;
  related_tmdb_id?: number | null;
  publish_at?: string | null;
  expires_at?: string | null;
  pinned?: boolean | null;
  sort_order?: number | null;
  updated_at?: string | null;
};

type NotificationPayload = {
  ok?: boolean;
  notifications?: SiteNotification[];
};

const readStorageKey = 'dofree_read_notifications';

const fallback: SiteNotification = {
  id: 'fallback',
  title: 'ยินดีต้อนรับสู่ดูดีดี.online',
  message: 'ติดตามประกาศ รายการอัปเดต และข้อมูลสำคัญจากปุ่มกระดิ่งนี้',
  type: 'general',
  cta_label: 'หน้าแรก',
  cta_url: '/',
};

const typeLabels: Record<string, string> = {
  general: 'ประกาศ',
  system: 'ระบบ',
  new_release: 'รายการใหม่',
  episode_update: 'ตอนใหม่',
  premium: 'Premium',
  maintenance: 'ปรับปรุงระบบ',
  help: 'ช่วยเหลือ',
  promotion: 'โปรโมชัน',
};

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 text-white md:h-8 md:w-8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.15">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function isSafeHref(value?: string | null) {
  if (!value) return false;
  const href = value.trim();
  const lower = href.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return false;
  if (href.startsWith('/') && !href.startsWith('//')) return true;

  try {
    const url = new URL(href);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isExternalHref(value?: string | null) {
  if (!value || value.startsWith('/')) return false;
  try {
    const url = new URL(value);
    return url.origin !== window.location.origin;
  } catch {
    return false;
  }
}

function isSafeImage(value?: string | null) {
  if (!value) return false;
  const src = value.trim();
  const lower = src.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return false;
  if (src.startsWith('/') && !src.startsWith('//')) return true;

  try {
    const url = new URL(src);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function readStoredIds() {
  try {
    const raw = window.localStorage.getItem(readStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function storeReadIds(ids: string[]) {
  try {
    window.localStorage.setItem(readStorageKey, JSON.stringify([...new Set(ids)].slice(-200)));
  } catch {}
}

function badgeText(item: SiteNotification) {
  return typeLabels[item.type || 'general'] || item.type || 'General';
}

function actionLink(label?: string | null, href?: string | null, tone: 'primary' | 'secondary' = 'primary') {
  if (!label || !href || !isSafeHref(href)) return null;
  const external = isExternalHref(href);
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer noopener' : undefined}
      onClick={(event) => event.stopPropagation()}
      className={`inline-flex min-h-9 items-center justify-center rounded-xl px-3 py-2 text-[11px] font-black ${tone === 'primary' ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.08] text-white/78 hover:bg-white/[0.14]'}`}
    >
      {label}
    </a>
  );
}

function relatedHref(item: SiteNotification) {
  if ((item.related_media_type === 'movie' || item.related_media_type === 'tv') && item.related_tmdb_id) {
    return `/${item.related_media_type}/${item.related_tmdb_id}`;
  }
  return null;
}

export function NotificationBellPortal() {
  const [headerHost, setHeaderHost] = useState<HTMLElement | null>(null);
  const [bodyHost, setBodyHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<SiteNotification[]>([fallback]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const { userState: premiumUserState } = usePremiumAccessSnapshot();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const visibleNotifications = useMemo(() => notifications.filter((item) => {
    const audience = item.audience || 'all';
    if (audience === 'admin') return premiumUserState.isAdmin;
    if (audience === 'premium') return premiumUserState.hasPremiumAccess;
    return true;
  }), [notifications, premiumUserState.hasPremiumAccess, premiumUserState.isAdmin]);

  const unreadCount = useMemo(
    () => visibleNotifications.filter((item) => item.id && !readIds.includes(item.id)).length,
    [visibleNotifications, readIds],
  );

  useEffect(() => {
    setBodyHost(document.body);
    setReadIds(readStoredIds());

    function findHeaderHost() {
      const menuHost = document.querySelector('[data-dofree-menu-host="true"]') as HTMLElement | null;
      const parent = menuHost?.parentElement || null;
      if (parent) {
        setHeaderHost(parent);
        window.clearInterval(timer);
      }
    }

    const timer = window.setInterval(findHeaderHost, 800);
    findHeaderHost();
    return () => window.clearInterval(timer);
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
    if (!open) return;
    setReadIds((current) => {
      const next = [...new Set([...current, ...visibleNotifications.map((item) => item.id).filter(Boolean)])];
      storeReadIds(next);
      return next;
    });
  }, [open, visibleNotifications]);

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

  function toggleExpanded(id: string) {
    setExpandedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  if (!bodyHost || !headerHost) return null;

  const button = createPortal(
    <button
      type="button"
      aria-label="เปิดการแจ้งเตือน"
      onClick={() => setOpen((value) => !value)}
      className="order-[-1] relative grid h-10 w-10 place-items-center rounded-none bg-transparent text-white transition hover:opacity-75 md:h-12 md:w-12"
    >
      <BellIcon />
      {unreadCount > 0 ? (
        <span className="absolute right-0.5 top-0 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#e50914] px-1 text-[10px] font-black leading-none text-white shadow-[0_0_18px_rgba(229,9,20,0.8)]">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : visibleNotifications.length ? (
        <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#e50914] shadow-[0_0_18px_rgba(229,9,20,0.8)]" />
      ) : null}
    </button>,
    headerHost,
  );

  const modal = open ? createPortal(
    <div ref={boxRef} className="fixed right-3 top-[66px] z-[1100] w-[calc(100vw-24px)] max-w-[390px] overflow-hidden rounded-2xl bg-white/[0.085] p-2 text-white shadow-[0_30px_110px_rgba(0,0,0,0.92),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-26px_70px_rgba(0,0,0,0.36)] backdrop-blur-3xl md:right-8 md:top-[92px] md:p-3">
      <div className="max-h-[min(680px,calc(100vh-92px))] overflow-y-auto rounded-2xl bg-black/42 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] md:p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#e50914]">การแจ้งเตือน</p>
            <h3 className="mt-1 text-2xl font-black tracking-[-0.04em]">ประกาศล่าสุด</h3>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-xl font-black text-white/80 hover:bg-[#e50914]">x</button>
        </div>
        <div className="mt-4 grid gap-2">
          {visibleNotifications.map((item) => {
            const expanded = expandedIds.includes(item.id);
            const related = relatedHref(item);
            return (
              <article
                key={item.id}
                onClick={() => toggleExpanded(item.id)}
                className="cursor-pointer rounded-2xl bg-white/[0.065] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-white/[0.095]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-[#e50914]/14 px-2 py-1 text-[10px] font-black uppercase text-red-100">{badgeText(item)}</span>
                      {item.pinned ? <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-black">ปักหมุด</span> : null}
                    </div>
                    <h4 className="mt-2 break-words text-sm font-black text-white/92">{item.title}</h4>
                  </div>
                  {item.priority ? <span className="rounded-lg bg-white/[0.08] px-2 py-1 text-[10px] font-black text-white/46">P{item.priority}</span> : null}
                </div>
                {isSafeImage(item.image_url) ? (
                  <div className="mt-3 aspect-[16/9] overflow-hidden rounded-xl bg-white/[0.06]">
                    <img src={item.image_url || ''} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : null}
                <p className="mt-2 break-words text-xs font-semibold leading-5 text-white/58">{item.message}</p>
                {expanded && item.detail ? <p className="mt-2 break-words text-xs font-semibold leading-5 text-white/42">{item.detail}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {actionLink(item.cta_label, item.cta_url)}
                  {actionLink(item.secondary_cta_label, item.secondary_cta_url, 'secondary')}
                  {related ? actionLink(item.related_media_type === 'tv' ? 'เปิดซีรีส์' : 'เปิดภาพยนตร์', related, 'secondary') : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>,
    bodyHost,
  ) : null;

  return <>{button}{modal}</>;
}
