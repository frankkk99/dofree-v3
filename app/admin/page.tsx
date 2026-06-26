import type { Metadata } from 'next';
import { AdminAuditPanel } from '@/components/admin-audit-panel';
import { AdminAuthGuard } from '@/components/admin-auth-guard';
import { AdminCatalogBrowser } from '@/components/admin-catalog-browser';
import { AdminDashboard } from '@/components/admin-dashboard';

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
      <main className="min-h-screen bg-[#030303] text-white">
        <AdminDashboard />
        <AdminAuditPanel />
        <section id="catalog-manager" className="border-t border-white/10">
          <AdminCatalogBrowser />
        </section>
      </main>
    </AdminAuthGuard>
  );
}
