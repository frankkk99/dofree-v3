'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const sync = () => setSession(getStoredSession());
    sync();
    window.addEventListener('dofree-auth-change', sync);
    return () => window.removeEventListener('dofree-auth-change', sync);
  }, []);

  return (
    <div className="sticky top-2 z-[80] mx-auto w-full max-w-7xl px-2 pt-2 md:px-8 md:pt-3">
      <div className="rounded-[22px] border border-white/12 bg-black/78 p-2 shadow-[0_24px_90px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 pb-2">
          <a href="/admin" className="shrink-0 rounded-2xl bg-[#e50914] px-3 py-2 text-[11px] font-black text-white shadow-glow md:px-4 md:text-xs">ดูดีดี Admin</a>
          <a href="/" className="shrink-0 rounded-2xl bg-white/[0.08] px-3 py-2 text-[11px] font-black text-white/75 hover:bg-white/[0.14] hover:text-white md:px-4 md:text-xs">Back to site</a>
          <button type="button" onClick={() => window.location.reload()} className="shrink-0 rounded-2xl bg-white/[0.08] px-3 py-2 text-[11px] font-black text-white/75 hover:bg-white/[0.14] hover:text-white md:px-4 md:text-xs">Refresh</button>
          <div className="ml-auto hidden min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-black text-white/70 md:block">
            <span className="text-white/35">Account</span>
            <span className="ml-2 inline-block max-w-[220px] truncate align-bottom">{accountLabel(session)}</span>
          </div>
        </div>
        <nav aria-label="Admin modules" className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {modules.map((module) => (
            <button
              key={module.id}
              type="button"
              onClick={() => onModuleChange(module.id)}
              className={`shrink-0 rounded-2xl px-3 py-2 text-[11px] font-black transition md:px-4 md:text-xs ${activeModule === module.id ? 'bg-white text-black shadow-[0_12px_36px_rgba(255,255,255,0.16)]' : 'bg-white/[0.08] text-white/72 hover:bg-white/[0.14] hover:text-white'}`}
            >
              {module.label}
            </button>
          ))}
          <a href="/admin/users" className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] font-black text-white/50 hover:bg-white/[0.08] hover:text-white md:px-4 md:text-xs">Users</a>
          <a href="/admin/memberships" className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] font-black text-white/50 hover:bg-white/[0.08] hover:text-white md:px-4 md:text-xs">Membership</a>
        </nav>
      </div>
    </div>
  );
}
