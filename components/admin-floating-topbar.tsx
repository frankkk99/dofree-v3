'use client';

import { useEffect, useState } from 'react';
import { getStoredSession, type DofreeSession } from '@/lib/supabase-auth-browser';

const modules = [
  { href: '#admin-dashboard-root', label: 'Dashboard' },
  { href: '#catalog-manager', label: 'Content' },
  { href: '#admin-control-center', label: 'Homepage' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/memberships', label: 'Membership' },
  { href: '#admin-premium-access', label: 'Premium Controls' },
  { href: '#maintenance', label: 'Reports', muted: true },
  { href: '#analytics', label: 'Analytics' },
  { href: '#health', label: 'Settings', muted: true },
  { href: '#admin-audit-log', label: 'Audit Log' },
];

function accountLabel(session: DofreeSession | null) {
  return session?.profile?.display_name || session?.user?.email || session?.user?.phone || 'Admin session';
}

export function AdminFloatingTopbar() {
  const [session, setSession] = useState<DofreeSession | null>(null);

  useEffect(() => {
    const sync = () => setSession(getStoredSession());
    sync();
    window.addEventListener('dofree-auth-change', sync);
    return () => window.removeEventListener('dofree-auth-change', sync);
  }, []);

  return (
    <div className="sticky top-3 z-[80] mx-auto w-full max-w-7xl px-3 pt-3 md:px-8">
      <div className="rounded-[24px] border border-white/12 bg-black/72 p-2 shadow-[0_24px_90px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-2">
          <a href="/admin" className="shrink-0 rounded-2xl bg-[#e50914] px-4 py-2 text-xs font-black text-white shadow-glow">DOFree Admin</a>
          <a href="/" className="shrink-0 rounded-2xl bg-white/[0.08] px-4 py-2 text-xs font-black text-white/75 hover:bg-white/[0.14] hover:text-white">Back to site</a>
          <button type="button" onClick={() => window.location.reload()} className="shrink-0 rounded-2xl bg-white/[0.08] px-4 py-2 text-xs font-black text-white/75 hover:bg-white/[0.14] hover:text-white">Refresh</button>
          <div className="ml-auto min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-black text-white/70">
            <span className="text-white/35">Account</span>
            <span className="ml-2 inline-block max-w-[220px] truncate align-bottom">{accountLabel(session)}</span>
          </div>
        </div>
        <nav aria-label="Admin modules" className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {modules.map((module) => (
            <a
              key={module.label}
              href={module.href}
              aria-disabled={module.muted ? 'true' : undefined}
              className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-black transition ${module.muted ? 'border border-dashed border-white/10 bg-white/[0.035] text-white/38 hover:text-white/55' : 'bg-white/[0.08] text-white/72 hover:bg-white/[0.14] hover:text-white'}`}
            >
              {module.label}
              {module.muted ? <span className="ml-2 text-[9px] uppercase tracking-[0.16em] text-white/25">soon</span> : null}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
