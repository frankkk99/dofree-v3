'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { HomePayload, MovieItem, MovieSection } from '@/lib/tmdb';
import { HomeExperienceV3 } from '@/components/home-experience-v3';
import { MovieCard } from '@/components/movie-card';
import { DetailWindow } from '@/components/window-system';
import { canUsePremiumFeature } from '@/lib/premium-access-config';
import { usePremiumAccessSnapshot } from '@/lib/premium-access-client';
import { getStoredSession, signOut, type DofreeUser } from '@/lib/supabase-auth-browser';

const FULL_SECTION_BATCH_SIZE = 24;

type SectionItemsResponse = {
  ok?: boolean;
  items?: MovieItem[];
  hasMore?: boolean;
};

function unique(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(`${item.mediaType}-${item.id}`, item);
  return [...map.values()];
}

function sectionDisplayTitle(section: MovieSection, index: number) {
  return index === 0 || section.slug === 'watch-ready' ? 'แนะนำสำหรับคุณ' : section.title;
}

function sectionFromTitle(title: string, sections: MovieSection[]) {
  const normalized = title.trim();
  if (!normalized) return null;
  if (normalized.includes('แนะนำสำหรับคุณ')) return sections[0] || null;

  return sections.find((section, index) => {
    const displayTitle = sectionDisplayTitle(section, index);
    return normalized === displayTitle || normalized.includes(displayTitle) || displayTitle.includes(normalized);
  }) || null;
}

function railFromTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest('.movie-rail') as HTMLElement | null;
}

function DesktopRailScrollFix() {
  useEffect(() => {
    let activeRail: HTMLElement | null = null;
    let startX = 0;
    let startLeft = 0;
    let dragged = false;

    function onWheel(event: WheelEvent) {
      const rail = railFromTarget(event.target);
      if (!rail || rail.scrollWidth <= rail.clientWidth) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      event.preventDefault();
      rail.scrollLeft += delta;
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === 'touch') return;
      const rail = railFromTarget(event.target);
      if (!rail || rail.scrollWidth <= rail.clientWidth) return;
      activeRail = rail;
      startX = event.clientX;
      startLeft = rail.scrollLeft;
      dragged = false;
      rail.style.cursor = 'grabbing';
      rail.style.userSelect = 'none';
    }

    function onPointerMove(event: PointerEvent) {
      if (!activeRail) return;
      const dx = event.clientX - startX;
      if (Math.abs(dx) > 4) dragged = true;
      if (dragged) event.preventDefault();
      activeRail.scrollLeft = startLeft - dx;
    }

    function stopDrag() {
      if (activeRail) {
        activeRail.style.cursor = '';
        activeRail.style.userSelect = '';
      }
      activeRail = null;
      window.setTimeout(() => { dragged = false; }, 0);
    }

    function onClick(event: MouseEvent) {
      if (!dragged) return;
      if (!railFromTarget(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    }

    document.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove, { passive: false });
    document.addEventListener('pointerup', stopDrag);
    document.addEventListener('pointercancel', stopDrag);
    document.addEventListener('click', onClick, true);

    return () => {
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', stopDrag);
      document.removeEventListener('pointercancel', stopDrag);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  return null;
}

function roleIsAdmin(role?: string | null) {
  return role === 'admin' || role === 'super_admin';
}

function HeaderAccountMenuPortal() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [bodyHost, setBodyHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [user, setUser] = useState<DofreeUser | null>(null);
  const [role, setRole] = useState<string>('');
  const { config: premiumAccessConfig, userState: premiumUserState } = usePremiumAccessSnapshot();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isSignedIn = Boolean(user?.id || user?.email || user?.phone);
  const isAdmin = isSignedIn && roleIsAdmin(role);
  const userLabel = user?.email || user?.phone || (user?.id ? `User ${user.id.slice(0, 8)}` : 'Guest');
  const accessUserState = { ...premiumUserState, isSignedIn, isAdmin: isAdmin || premiumUserState.isAdmin };
  const favoritesAllowed = canUsePremiumFeature('favorites', accessUserState, premiumAccessConfig);
  const historyAllowed = canUsePremiumFeature('history', accessUserState, premiumAccessConfig);
  const memberLinks = [
    {
      href: isSignedIn ? (favoritesAllowed ? '/favorites' : '/membership') : '/auth?mode=signin',
      title: '♡ รายการโปรด',
      desc: favoritesAllowed ? 'เก็บหนังที่อยากดูไว้ในบัญชี' : 'Premium เท่านั้น',
      locked: isSignedIn && !favoritesAllowed,
      badge: favoritesAllowed && isSignedIn && !premiumUserState.hasPremiumAccess ? premiumAccessConfig.label : '',
    },
    {
      href: isSignedIn ? (historyAllowed ? '/history' : '/membership') : '/auth?mode=signin',
      title: '⏱ ประวัติการรับชม',
      desc: historyAllowed ? 'ดูเรื่องที่เปิดล่าสุดและดูต่อ' : 'Premium เท่านั้น',
      locked: isSignedIn && !historyAllowed,
      badge: historyAllowed && isSignedIn && !premiumUserState.hasPremiumAccess ? premiumAccessConfig.label : '',
    },
    {
      href: '/membership',
      title: '♛ สมัครสมาชิก',
      desc: 'Premium / ไม่มีโฆษณา / ดูต่อทุกอุปกรณ์',
      locked: false,
      badge: '',
    },
  ];

  useEffect(() => {
    setBodyHost(document.body);

    function syncAuth() {
      const session = getStoredSession();
      setUser(session?.user || null);
      setRole(session?.profile?.role || session?.user?.role || '');
    }

    function findHost() {
      const menuHost = document.querySelector('[data-dofree-menu-host="true"]') as HTMLElement | null;
      if (menuHost) setHost(menuHost);
    }

    syncAuth();
    findHost();
    const timer = window.setInterval(findHost, 1000);
    window.addEventListener('storage', syncAuth);
    window.addEventListener('dofree-auth-change', syncAuth);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('dofree-auth-change', syncAuth);
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    function onClick(event: MouseEvent) {
      if (!open) return;
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    document.body.style.overflow = open ? 'hidden' : '';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
      document.body.style.overflow = '';
    };
  }, [open]);

  async function handleLogout() {
    await signOut();
    setUser(null);
    setRole('');
    setOpen(false);
  }

  if (!host) return null;

  const menuButton = createPortal(
    <div ref={menuRef} className="relative">
      <button type="button" aria-label="เปิดเมนู" data-dofree-menu-button="true" onClick={() => setOpen((value) => !value)} className="grid h-10 w-10 place-items-center rounded-none bg-transparent text-white transition hover:opacity-75 md:h-12 md:w-12">
        <span className="flex flex-col gap-[6px]">
          <span className="block h-[3px] w-8 rounded-full bg-white md:w-9" />
          <span className="block h-[3px] w-8 rounded-full bg-white md:w-9" />
          <span className="block h-[3px] w-8 rounded-full bg-white md:w-9" />
        </span>
      </button>
    </div>,
    host
  );

  const drawer = open && bodyHost ? createPortal(
    <div className="fixed inset-0 z-[1000] overflow-y-auto bg-black/54 px-4 py-5 text-white backdrop-blur-[10px]" onMouseDown={() => setOpen(false)}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_85%_6%,rgba(229,9,20,0.25),transparent_20rem),radial-gradient(circle_at_20%_100%,rgba(255,255,255,0.08),transparent_22rem)]" />
      <aside className="relative ml-auto min-h-[calc(100svh-40px)] w-full max-w-[430px] overflow-hidden rounded-[34px] bg-white/[0.075] p-4 shadow-[0_40px_150px_rgba(0,0,0,0.92),inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-38px_90px_rgba(0,0,0,0.42)] backdrop-blur-3xl md:mr-4 md:mt-4 md:min-h-[auto] md:max-h-[calc(100svh-40px)] md:overflow-y-auto md:p-5" onMouseDown={(event) => event.stopPropagation()}>
        <div className="rounded-[28px] bg-black/32 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-24px_70px_rgba(255,255,255,0.025)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.30em] text-[#e50914]">Account</p>
              <h3 className="mt-2 text-[27px] font-black tracking-[-0.06em] md:text-[32px]">{isSignedIn ? 'บัญชีของฉัน' : 'เมนูผู้ใช้'}</h3>
              <p className="mt-2 break-all text-sm font-semibold leading-5 text-white/58">{isSignedIn ? userLabel : 'บัญชี รายการโปรด ประวัติ และสมาชิก'}</p>
            </div>
            <button type="button" aria-label="ปิดเมนู" onClick={() => setOpen(false)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/[0.09] text-2xl font-black text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:bg-[#e50914] hover:text-white">×</button>
          </div>
        </div>

        {isSignedIn ? (
          <div className="mt-4 rounded-[28px] bg-[#1d0307]/64 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_22px_70px_rgba(229,9,20,0.08)]">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e50914]">Signed in</p>
            <p className="mt-3 break-all text-base font-black text-white/90">{userLabel}</p>
            <button type="button" onClick={handleLogout} className="mt-4 h-12 w-full rounded-[22px] bg-white/[0.09] text-sm font-black text-white/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-white/[0.14] hover:text-white">Logout</button>
          </div>
        ) : null}

        <div className="mt-4 grid gap-2.5">
          {isAdmin ? (
            <a href="/admin" className="rounded-[24px] bg-[#e50914] px-4 py-4 text-left shadow-[0_18px_60px_rgba(229,9,20,0.32)] transition hover:scale-[1.01]">
              <span className="block text-base font-black text-white">Admin Dashboard</span>
              <span className="mt-1 block text-xs font-semibold text-white/72">จัดการหนัง หมวดหมู่ ระบบหลังบ้าน</span>
            </a>
          ) : null}
          {memberLinks.map(({ href, title, desc, locked, badge }) => (
            <a key={href} href={href} className="rounded-[24px] bg-white/[0.065] px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] transition hover:bg-white/[0.105]">
              <span className="flex items-center justify-between gap-3 text-base font-black text-white/92">
                <span>{title}</span>
                {locked ? <span className="rounded-full bg-white/[0.1] px-2 py-1 text-[9px] text-white/58">Premium</span> : badge ? <span className="rounded-full bg-[#e50914]/18 px-2 py-1 text-[9px] text-red-100">{badge}</span> : null}
              </span>
              <span className="mt-1 block text-xs font-semibold text-white/42">{desc}</span>
            </a>
          ))}
        </div>

        {!isSignedIn ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href="/auth?mode=signin" onClick={() => setAuthMode('signin')} className={`rounded-[22px] px-4 py-3 text-center text-xs font-black ${authMode === 'signin' ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.075] text-white/72 hover:bg-white/[0.12]'}`}>Sign in</a>
              <a href="/auth?mode=signup" onClick={() => setAuthMode('signup')} className={`rounded-[22px] px-4 py-3 text-center text-xs font-black ${authMode === 'signup' ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.075] text-white/72 hover:bg-white/[0.12]'}`}>Sign up</a>
            </div>

            <div className="mt-4 rounded-[26px] bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/42">เข้าสู่ระบบด้วย</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Google', '/auth?provider=google'],
                  ['Facebook', '/auth?provider=facebook'],
                  ['Apple', '/auth?provider=apple'],
                  ['LINE', '/auth?provider=line'],
                  ['Email', '/auth?method=email'],
                  ['เบอร์โทร', '/auth?method=phone'],
                ].map(([label, href]) => (
                  <a key={label} href={href} className="rounded-[16px] bg-black/38 px-3 py-2.5 text-center text-[11px] font-black text-white/76 transition hover:bg-[#e50914] hover:text-white">{label}</a>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </aside>
    </div>,
    bodyHost
  ) : null;

  return <>{menuButton}{drawer}</>;
}

function ViewAllClickBridge({ sections, onOpen }: { sections: MovieSection[]; onOpen: (section: MovieSection) => void }) {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('a');
      if (!link || !link.textContent?.includes('ดูทั้งหมด')) return;
      const wrapper = link.closest('.relative') || link.parentElement;
      const title = wrapper?.querySelector('h2')?.textContent || '';
      const section = sectionFromTitle(title, sections) || sections[0];
      if (!section) return;
      event.preventDefault();
      event.stopPropagation();
      onOpen(section);
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [onOpen, sections]);
  return null;
}

function FullSectionOverlay({ section, allItems, onClose }: { section: MovieSection; allItems: MovieItem[]; onClose: () => void }) {
  const [selected, setSelected] = useState<MovieItem | null>(null);
  const [items, setItems] = useState<MovieItem[]>(() => unique(section.items));
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadingGuardRef = useRef(false);
  const recommendations = selected ? allItems.filter((item) => `${item.mediaType}-${item.id}` !== `${selected.mediaType}-${selected.id}`).slice(0, 24) : allItems.slice(0, 24);

  const loadMore = useCallback(async () => {
    if (loadingGuardRef.current || loadingMore || !hasMore) return;
    loadingGuardRef.current = true;
    setLoadingMore(true);

    try {
      const response = await fetch(`/api/catalog/section?slug=${encodeURIComponent(section.slug)}&limit=${FULL_SECTION_BATCH_SIZE}&offset=${items.length}`, { cache: 'no-store' });
      const data = await response.json() as SectionItemsResponse;
      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems((current) => unique([...current, ...nextItems]));
      setHasMore(Boolean(data.hasMore) && nextItems.length > 0);
    } catch {
      setHasMore(false);
    } finally {
      loadingGuardRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, items.length, loadingMore, section.slug]);

  useEffect(() => {
    setSelected(null);
    setItems(unique(section.items));
    setHasMore(true);
    setLoadingMore(false);
    loadingGuardRef.current = false;
  }, [section]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadMore(); }, 120);
    return () => window.clearTimeout(timer);
  }, [loadMore]);

  useEffect(() => {
    if (!hasMore || typeof IntersectionObserver === 'undefined') return;
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void loadMore();
    }, { rootMargin: '680px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#030303]/96 p-4 text-white backdrop-blur-xl md:p-7">
      <div className="mx-auto max-w-[1920px]">
        <div className="sticky top-0 z-10 mb-5 flex items-end justify-between gap-3 border-b border-white/10 bg-[#030303]/88 py-4 backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]/80">{section.eyebrow || 'Category'}</p>
            <h2 className="mt-1 text-[28px] font-black tracking-[-0.05em] md:text-[48px]">{section.title}</h2>
            <p className="mt-1 text-xs font-bold text-white/45">โหลดแล้ว {items.length} เรื่อง{hasMore ? ' · กำลังโหลดเพิ่มเมื่อเลื่อน' : ' · ครบหมวดแล้ว'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/[0.1] px-4 py-2 text-xs font-black text-white/80 hover:bg-[#e50914]">ปิด</button>
        </div>
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-6 md:gap-4 lg:grid-cols-7 xl:grid-cols-8">
          {items.map((item, index) => <MovieCard key={`full-${section.slug}-${item.mediaType}-${item.id}-${index}`} item={item} onSelect={setSelected} grid priority={index < 12} priorityBadge={section.title === 'ทั้งหมด' ? undefined : section.title} />)}
        </div>
        <div ref={loadMoreRef} className="py-8 text-center">
          {hasMore ? <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="rounded-full bg-white/[0.09] px-5 py-3 text-xs font-black text-white/60 hover:bg-white/[0.14] hover:text-white">{loadingMore ? 'กำลังโหลดเพิ่ม...' : 'โหลดเพิ่ม'}</button> : <span className="text-xs font-black text-white/35">แสดงครบหมวดแล้ว</span>}
        </div>
      </div>
      {selected ? <DetailWindow item={selected} recommendations={recommendations} onClose={() => setSelected(null)} onSelect={setSelected} /> : null}
    </div>
  );
}

export function HomeRealtimeWrapper({ home }: { home: HomePayload }) {
  const [openSection, setOpenSection] = useState<MovieSection | null>(null);
  const allItems = useMemo(() => unique(home.sections.flatMap((section) => section.items)), [home.sections]);
  return (
    <>
      <HomeExperienceV3 home={home} />
      <HeaderAccountMenuPortal />
      <DesktopRailScrollFix />
      <ViewAllClickBridge sections={home.sections} onOpen={setOpenSection} />
      {openSection ? <FullSectionOverlay section={openSection} allItems={allItems} onClose={() => setOpenSection(null)} /> : null}
    </>
  );
}
