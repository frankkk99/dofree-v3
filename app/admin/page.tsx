import type { Metadata } from 'next';
import { AdminAuditLogPanel } from '@/components/admin-audit-log-panel';
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
        <section className="mx-auto w-full max-w-7xl px-4 pb-6 md:px-8">
          <a href="/admin/series" className="block rounded-[26px] border border-[#e50914]/28 bg-[#170203]/70 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.45)] transition hover:border-[#e50914]/70 hover:bg-[#230407]">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e50914]">Series Bulk Tool</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">ลงซีรีส์หลายตอนในหน้าเดียว</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/48">เพิ่ม S1 E1-E16 หรือหลายซีซันได้จากการวางรายการหลายบรรทัด แล้วบันทึกเข้าระบบตอนของซีรีส์อัตโนมัติ</p>
          </a>
        </section>
        <AdminAuditLogPanel />
        <section id="catalog-manager" className="border-t border-white/10">
          <AdminCatalogBrowser />
        </section>
      </main>
    </AdminAuthGuard>
  );
}
