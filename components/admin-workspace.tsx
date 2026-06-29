'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminAuditLogPanel } from '@/components/admin-audit-log-panel';
import { AdminCatalogBrowser } from '@/components/admin-catalog-browser';
import { AdminControlCenter } from '@/components/admin-control-center';
import { AdminDashboard } from '@/components/admin-dashboard';
import { AdminFloatingTopbar, type AdminModuleId } from '@/components/admin-floating-topbar';
import { AdminPremiumAccessPanel } from '@/components/admin-premium-access-panel';

const moduleCopy: Record<AdminModuleId, { title: string; description: string }> = {
  dashboard: {
    title: 'Dashboard',
    description: 'Overview, analytics, health, and quick admin signals.',
  },
  content: {
    title: 'Content Catalog',
    description: 'Manage movie and series links, filters, episode rows, and catalog status.',
  },
  homepage: {
    title: 'Homepage Control',
    description: 'Tune homepage categories and the cards shown in each section.',
  },
  premium: {
    title: 'Premium Controls',
    description: 'Control free premium access flags without changing real payment logic.',
  },
  audit: {
    title: 'Audit Log',
    description: 'Review admin update history only when this module is open.',
  },
};

const validModules = new Set<AdminModuleId>(['dashboard', 'content', 'homepage', 'premium', 'audit']);

function normalizeModule(value: string | null): AdminModuleId {
  return validModules.has(value as AdminModuleId) ? (value as AdminModuleId) : 'dashboard';
}

export function AdminWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeModule = normalizeModule(searchParams.get('module'));
  const copy = moduleCopy[activeModule];

  const moduleParams = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);

  function setModule(module: AdminModuleId) {
    const params = new URLSearchParams(moduleParams.toString());
    if (module === 'dashboard') {
      params.delete('module');
    } else {
      params.set('module', module);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <>
      <AdminFloatingTopbar activeModule={activeModule} onModuleChange={setModule} />
      <section className="mx-auto w-full max-w-7xl px-4 pt-5 md:px-8 md:pt-6">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.38)] md:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">Admin Workspace</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] md:text-5xl">{copy.title}</h1>
          <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-white/48">{copy.description}</p>
        </div>
      </section>

      {activeModule === 'dashboard' ? (
        <section id="admin-dashboard-root">
          <AdminDashboard />
        </section>
      ) : null}
      {activeModule === 'content' ? (
        <section id="catalog-manager" className="border-t border-white/10">
          <AdminCatalogBrowser />
        </section>
      ) : null}
      {activeModule === 'homepage' ? <AdminControlCenter /> : null}
      {activeModule === 'premium' ? <AdminPremiumAccessPanel /> : null}
      {activeModule === 'audit' ? (
        <section id="admin-audit-log">
          <AdminAuditLogPanel />
        </section>
      ) : null}
    </>
  );
}
