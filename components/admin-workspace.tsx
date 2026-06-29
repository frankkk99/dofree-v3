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
      <section className="mx-auto w-full max-w-7xl px-4 pt-4 text-white md:px-8 md:pt-6">
        <div className="admin-floating-glass rounded-2xl p-4 md:rounded-[24px] md:p-5">
        <h1 className="text-2xl font-black tracking-[-0.04em] md:text-4xl">{copy.title}</h1>
        <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-white/72">{copy.description}</p>
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
