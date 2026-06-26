'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getStoredSession, signOut, type DofreeUser } from '@/lib/supabase-auth-browser';

type MenuItem = {
  href: string;
  label: string;
  desc: string;
  icon: string;
  tone?: 'primary' | 'admin';
};

const mainItems: MenuItem[] = [
  { href: '/search', label: 'ค้นหาหนัง', desc: 'ค้นหาชื่อเรื่องหรือซีรีส์ที่ต้องการ', icon: '⌕', tone: 'primary' },
  { href: '/watch-ready', label: 'พร้อมรับชม', desc: 'รวมเรื่องที่เปิดดูได้ทันที', icon: '▶' },
  { href: '/favorites', label: 'รายการโปรด', desc: 'หนังที่บันทึกไว้ดูภายหลัง', icon: '♡' },
  { href: '/history', label: 'ประวัติการรับชม', desc: 'กลับไปดูเรื่องที่เคยเปิดไว้', icon: '↺' },
];

const accountItems: MenuItem[] = [
  { href: '/auth?mode=signin', label: 'เข้าสู่ระบบ', desc: 'ใช้บัญชีเพื่อซิงก์ข้อมูลการรับชม', icon: '↳', tone: 'primary' },
  { href: '/auth?mode=signup', label: 'สมัครสมาชิก', desc: 'สร้างบัญชีใหม่สำหรับดูดีดี', icon: '+' },
  { href: '/membership', label: 'สมาชิกพรีเมียม', desc: 'แพ็กเกจและสิทธิ์การใช้งาน', icon: '♛' },
];

const systemItems: MenuItem[] = [
  { href: '/admin', label: 'Admin Dashboard', desc: 'จัดการระบบหลังบ้าน', icon: '⚙', tone: 'admin' },
  { href: '/admin/sync', label: 'Sync TMDB', desc: 'ซิงก์ข้อมูลหนังเข้าระบบ', icon: '⇄', tone: 'admin' },
  { href: '/cms', label: 'CMS', desc: 'พื้นที่จัดการคอนเทนต์', icon: '▦', tone: 'admin' },
];

function MenuLink({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  const toneClass = item.tone === 'primary'
    ? 'border-[#e50914]/45 bg-[#e50914]/14 text-white hover:bg-[#e50914]/24'
    : item.tone === 'admin'
      ? 'border-amber-300/20 bg-amber-300/8 text-amber-100 hover:bg-amber-300/12'
      : 'border-white/8 bg-white/[0.055] text-white/86 hover:border-white/16 hover:bg-white/[0.09]';

  return (
    <a href={item.href} onClick={onClick} className={`group flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition ${toneClass}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black/36 text-sm font-black text-white/90 ring-1 ring-white/8">{item.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black leading-5">{item.label}</span>
        <span className="mt-0.5 block truncate text-[11px] font-semibold text-white/42">{item.desc}</span>
      </span>
      <span className="text-lg font-black text-white/28 transition group-hover:translate-x-0.5 group-hover:text-white/70">›</span>
    </a>
  );
}

function MenuSection({ title, items, onClick }: { title: string; items: MenuItem[]; onClick: () => void }) {
  return (
    <section className="mt-5">
      <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/34">{title}</p>
      <div className="grid gap-2">
        {items.map((item) => <MenuLink key={item.href} item={item} onClick={onClick} />)}
      </div>
    </section>
  );
}

export function CleanHamburgerMenu() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<DofreeUser | null>(null);
  const isSignedIn = Boolean(user?.id || user?.email || user?.phone);
  const userLabel = user?.email || user?.phone || (user?.id ? `User ${user.id.slice(0, 8)}` : 'Guest');

  useEffect(() => {
    setMounted(true);

    function syncAuth() {
      setUser(getStoredSession()?.user || null);
    }

    function interceptHamburger(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('button[aria-label="เปิดเมนูบัญชี"]');
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setOpen((value) => !value);
    }

    syncAuth();
    document.addEventListener('click', interceptHamburger, true);
    window.addEventListener('storage', syncAuth);
    window.addEventListener('dofree-auth-change', syncAuth);

    return () => {
      document.removeEventListener('click', interceptHamburger, true);
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('dofree-auth-change', syncAuth);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  async function handleLogout() {
    await signOut();
    setUser(null);
    setOpen(false);
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1100] bg-black/72 text-white backdrop-blur-xl" onMouseDown={() => setOpen(false)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_8%,rgba(229,9,20,0.24),transparent_22rem),radial-gradient(circle_at_10%_84%,rgba(255,255,255,0.05),transparent_18rem)]" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="เมนูหลักดูดีดี"
        className="absolute bottom-2 right-2 top-2 flex w-[calc(100vw-16px)] max-w-[430px] flex-col overflow-hidden rounded-[30px] border border-white/12 bg-[#050505] shadow-[0_40px_140px_rgba(0,0,0,0.92)] md:bottom-6 md:right-6 md:top-6 md:w-[430px]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="border-b border-white/8 bg-white/[0.035] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">DodeedeeV3 Menu</p>
              <h2 className="mt-1 text-[30px] font-black leading-none tracking-[-0.07em]">ดูดีดี</h2>
              <p className="mt-2 max-w-[300px] text-xs font-semibold leading-5 text-white/44">
                เมนูหลักถูกจัดใหม่ให้เลือกทางไปต่อได้เร็วขึ้น
              </p>
            </div>
            <button type="button" aria-label="ปิดเมนู" onClick={() => setOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.08] text-xl font-black text-white/80 transition hover:bg-[#e50914] hover:text-white">
              ×
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/8 bg-black/34 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/34">สถานะบัญชี</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white/88">{isSignedIn ? userLabel : 'ยังไม่ได้เข้าสู่ระบบ'}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-white/38">{isSignedIn ? 'ข้อมูลบัญชีพร้อมใช้งาน' : 'เข้าสู่ระบบเพื่อบันทึกรายการโปรดและประวัติ'}</p>
              </div>
              {isSignedIn ? (
                <button type="button" onClick={handleLogout} className="h-9 shrink-0 rounded-xl bg-white/[0.08] px-3 text-[11px] font-black text-white/72 transition hover:bg-white/[0.14] hover:text-white">ออก</button>
              ) : (
                <a href="/auth?mode=signin" onClick={() => setOpen(false)} className="h-9 shrink-0 rounded-xl bg-[#e50914] px-3 pt-2 text-[11px] font-black text-white shadow-glow">เข้าใช้</a>
              )}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">
          <MenuSection title="เริ่มใช้งาน" items={mainItems} onClick={() => setOpen(false)} />
          {!isSignedIn ? <MenuSection title="บัญชี" items={accountItems} onClick={() => setOpen(false)} /> : null}
          <MenuSection title="หลังบ้าน / ระบบ" items={systemItems} onClick={() => setOpen(false)} />

          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.035] p-3">
            <p className="text-xs font-black text-white/70">ลำดับใช้งานแนะนำ</p>
            <ol className="mt-2 space-y-1.5 text-[11px] font-semibold leading-5 text-white/42">
              <li>1. กด “ค้นหาหนัง” หรือ “พร้อมรับชม”</li>
              <li>2. เปิดรายละเอียดเรื่องที่สนใจ</li>
              <li>3. บันทึกรายการโปรดหรือดูประวัติภายหลัง</li>
            </ol>
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
