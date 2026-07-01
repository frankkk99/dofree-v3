'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { HomePayload } from '@/lib/tmdb';
import { HomeExperienceV3 } from '@/components/home-experience-v3';
import { UserHelpModal } from '@/components/user-help-modal';
import { canUsePremiumFeature } from '@/lib/premium-access-config';
import { usePremiumAccessSnapshot } from '@/lib/premium-access-client';
import { getStoredSession, signOut, type DofreeUser } from '@/lib/supabase-auth-browser';

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
  const [helpOpen, setHelpOpen] = useState(false);
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
      title: 'รายการโปรด',
      desc: favoritesAllowed ? 'เก็บเรื่องที่อยากดูไว้ในบัญชีของคุณ' : 'สำหรับสมาชิกเท่านั้น',
      locked: isSignedIn && !favoritesAllowed,
      badge: favoritesAllowed && isSignedIn && !premiumUserState.hasPremiumAccess ? premiumAccessConfig.label : '',
    },
    {
      href: isSignedIn ? (historyAllowed ? '/history' : '/membership') : '/auth?mode=signin',
      title: 'ประวัติการรับชม',
      desc: historyAllowed ? 'กลับไปดูเรื่องที่เปิดล่าสุดได้ง่ายขึ้น' : 'สำหรับสมาชิกเท่านั้น',
      locked: isSignedIn && !historyAllowed,
      badge: historyAllowed && isSignedIn && !premiumUserState.hasPremiumAccess ? premiumAccessConfig.label : '',
    },
    {
      href: '/membership',
      title: 'สมาชิก',
      desc: 'ดูสิทธิ์สมาชิกและสถานะบัญชี',
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
      if (menuHost) {
        setHost(menuHost);
        window.clearInterval(timer);
      }
    }

    syncAuth();
    const timer = window.setInterval(findHost, 1000);
    findHost();
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
              <p className="mt-2 break-all text-sm font-semibold leading-5 text-white/58">{isSignedIn ? userLabel : 'เข้าสู่ระบบเพื่อใช้รายการโปรด ประวัติ และสิทธิ์สมาชิก'}</p>
            </div>
            <button type="button" aria-label="ปิดเมนู" onClick={() => setOpen(false)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/[0.09] text-2xl font-black text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:bg-[#e50914] hover:text-white">×</button>
          </div>
        </div>

        {isSignedIn ? (
          <div className="mt-4 rounded-[28px] bg-[#1d0307]/64 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_22px_70px_rgba(229,9,20,0.08)]">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e50914]">Signed in</p>
            <p className="mt-3 break-all text-base font-black text-white/90">{userLabel}</p>
            <button type="button" onClick={handleLogout} className="mt-4 h-12 w-full rounded-[22px] bg-white/[0.09] text-sm font-black text-white/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-white/[0.14] hover:text-white">ออกจากระบบ</button>
          </div>
        ) : null}

        {isSignedIn ? <div className="mt-4 grid gap-2.5">
          {isAdmin ? (
            <a href="/admin" className="rounded-[24px] bg-[#e50914] px-4 py-4 text-left shadow-[0_18px_60px_rgba(229,9,20,0.32)] transition hover:scale-[1.01]">
              <span className="block text-base font-black text-white">Admin Dashboard</span>
              <span className="mt-1 block text-xs font-semibold text-white/72">จัดการข้อมูลและระบบหลังบ้าน</span>
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
        </div> : null}

        <button
          type="button"
          onClick={() => {
            setHelpOpen(true);
            setOpen(false);
          }}
          className="mt-4 w-full rounded-[24px] bg-white/[0.065] px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] transition hover:bg-white/[0.105]"
        >
          <span className="block text-base font-black text-white/92">วิธีใช้งานเว็บ</span>
          <span className="mt-1 block text-xs font-semibold leading-5 text-white/42">คู่มือการค้นหา รับชม รายการโปรด ประวัติ และคำถามที่พบบ่อย</span>
        </button>

        {!isSignedIn ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href="/auth?mode=signin&next=/" className="rounded-[22px] bg-[#e50914] px-4 py-3 text-center text-xs font-black text-white shadow-glow transition hover:bg-red-600">เข้าสู่ระบบ</a>
            <a href="/auth?mode=signup&next=/" className="rounded-[22px] bg-white/[0.075] px-4 py-3 text-center text-xs font-black text-white/72 transition hover:bg-white/[0.12] hover:text-white">สมัครสมาชิก</a>
          </div>
        ) : null}
      </aside>
    </div>,
    bodyHost
  ) : null;

  return <>{menuButton}{drawer}<UserHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} /></>;
}

function AuthSuccessToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const key = 'dofree_auth_success';
    const value = window.sessionStorage.getItem(key);
    if (!value) return;

    window.sessionStorage.removeItem(key);
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 2800);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-[1001] w-[calc(100vw-32px)] max-w-[390px] -translate-x-1/2 rounded-[24px] border border-white/15 bg-black/55 px-5 py-4 text-white shadow-[0_26px_90px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-2xl md:bottom-7 md:left-auto md:right-7 md:w-[360px] md:translate-x-0">
      <p className="text-sm font-black">เข้าสู่ระบบเรียบร้อย</p>
      <p className="mt-1 text-xs font-semibold text-white/58">ยินดีต้อนรับกลับสู่ดูดีดี.online</p>
    </div>
  );
}

export function HomeRealtimeWrapper({ home }: { home: HomePayload }) {
  return (
    <>
      <HomeExperienceV3 home={home} />
      <HeaderAccountMenuPortal />
      <AuthSuccessToast />
      <DesktopRailScrollFix />
    </>
  );
}
