import type { Metadata } from 'next';
import { AdminAuditLogPanel } from '@/components/admin-audit-log-panel';
import { AdminAuthGuard } from '@/components/admin-auth-guard';
import { AdminCatalogBrowser } from '@/components/admin-catalog-browser';
import { AdminControlCenter } from '@/components/admin-control-center';
import { AdminDashboard } from '@/components/admin-dashboard';
import { AdminFloatingTopbar } from '@/components/admin-floating-topbar';
import { AdminPremiumAccessPanel } from '@/components/admin-premium-access-panel';
import { AdminSeriesBulkManager } from '@/components/admin-series-bulk-manager';

export const metadata: Metadata = {
  title: 'DodeedeeV3 Admin Dashboard',
  description: 'ดูดีดี / DodeedeeV3 admin command center',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <AdminAuthGuard>
      <main className="min-h-screen scroll-smooth bg-[#030303] text-white">
        <AdminFloatingTopbar />
        <section id="admin-dashboard-root">
          <AdminDashboard />
        </section>
        <AdminPremiumAccessPanel />
        <AdminControlCenter />
        <section id="series-bulk-manager" className="border-y border-white/10 bg-black/20">
          <AdminSeriesBulkManager />
        </section>
        <section id="admin-audit-log">
          <AdminAuditLogPanel />
        </section>
        <section id="catalog-manager" className="border-t border-white/10">
          <AdminCatalogBrowser />
        </section>
      </main>
    </AdminAuthGuard>
  );
}
