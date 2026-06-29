'use client';

import { useEffect, useRef, useState } from 'react';
import { getStoredSession, type DofreeSession } from '@/lib/supabase-auth-browser';

export type AdminModuleId = 'dashboard' | 'content' | 'homepage' | 'premium' | 'audit';

const modules = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'content', label: 'Content' },
  { id: 'homepage', label: 'Homepage' },
  { id: 'premium', label: 'Premium' },
  { id: 'audit', label: 'Audit' },
] satisfies { id: AdminModuleId; label: string }[];

function accountLabel(session: DofreeSession | null) {
  return session?.profile?.display_name || session?.user?.email || session?.user?.phone || 'Admin session';
}

export function AdminFloatingTopbar({
  activeModule,
  onModuleChange,
}: {
  activeModule: AdminModuleId;
  onModuleChange: (module: AdminModuleId) => void;
}) {
  const [session, setSession] = useState<DofreeSession | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sync = () => setSession(getStoredSession());
    sync();
    window.addEventListener('dofree-auth-change', sync);
    return () => window.removeEventListener('dofree-auth-change', sync);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <div className="sticky top-0 z-[80] mx-auto w-full max-w-7xl px-2 pt-2 md:top-3 md:px-8 md:pt-3">
      <div className="rounded-2xl border border-white/10 bg-black/82 p-2 shadow-[0_14px_44px_rgba(0,0,0,0.52)] backdrop-blur-2xl md:rounded-[24px]">
        <div className="flex items-center gap-2 border-b border-white/8 pb-2">
          <a href="/admin" className="shrink-0 rounded-xl bg-[#e50914] px-3 py-2 text-xs font-black text-white md:rounded-2xl md:px-4">DOFree Admin</a>
          <div className="ml-auto min-w-0 text-right text-[10px] font-bold text-white/42 max-sm:hidden">
            <span className="inline-block max-w-[220px] truncate align-bottom">{accountLabel(session)}</span>
          </div>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="Admin menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.08] text-xl font-black leading-none text-white hover:bg-white/[0.14]"
            >
              ...
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-11 z-10 grid min-w-44 gap-1 rounded-2xl border border-white/10 bg-[#080808] p-2 shadow-[0_20px_80px_rgba(0,0,0,0.72)]">
                <a href="/" className="rounded-xl px-3 py-2 text-xs font-black text-white/72 hover:bg-white/[0.08] hover:text-white">Back to site</a>
                <button type="button" onClick={() => window.location.reload()} className="rounded-xl px-3 py-2 text-left text-xs font-black text-white/72 hover:bg-white/[0.08] hover:text-white">Refresh</button>
                <a href="/admin/users" className="rounded-xl px-3 py-2 text-xs font-black text-white/72 hover:bg-white/[0.08] hover:text-white">Users</a>
                <a href="/admin/memberships" className="rounded-xl px-3 py-2 text-xs font-black text-white/72 hover:bg-white/[0.08] hover:text-white">Membership</a>
                <div className="mt-1 border-t border-white/10 px-3 pt-2 text-[10px] font-bold text-white/36">{accountLabel(session)}</div>
              </div>
            ) : null}
          </div>
        </div>
        <nav aria-label="Admin modules" className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {modules.map((module) => (
            <button
              key={module.id}
              type="button"
              onClick={() => onModuleChange(module.id)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-black transition md:rounded-2xl md:px-4 md:py-2 md:text-xs ${activeModule === module.id ? 'bg-white text-black shadow-[0_8px_22px_rgba(255,255,255,0.12)]' : 'bg-white/[0.08] text-white/72 hover:bg-white/[0.14] hover:text-white'}`}
            >
              {module.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
