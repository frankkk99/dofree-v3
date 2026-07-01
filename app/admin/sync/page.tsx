import type { Metadata } from 'next';
import { AdminAuthGuard } from '@/components/admin-auth-guard';
import { AdminSyncCenter } from '@/components/admin-sync-center';

export const metadata: Metadata = {
  title: 'Admin Sync | DOFree',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminSyncPage() {
  return (
    <AdminAuthGuard>
      <div className="admin-sync-legacy-theme">
        <style>{`
          .admin-sync-legacy-theme main {
            background: #050505 !important;
          }
          .admin-sync-legacy-theme main > div > section {
            border-color: rgba(255,255,255,0.08) !important;
            background: rgba(255,255,255,0.035) !important;
            box-shadow: 0 24px 90px rgba(0,0,0,0.55) !important;
            backdrop-filter: blur(24px);
          }
          .admin-sync-legacy-theme main > div > section:first-child {
            border-color: rgba(255,255,255,0.06) !important;
            background: radial-gradient(circle at 18% 10%, rgba(229,9,20,0.32), transparent 26rem), linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)) !important;
            box-shadow: 0 34px 140px rgba(0,0,0,0.72) !important;
          }
          .admin-sync-legacy-theme article,
          .admin-sync-legacy-theme label,
          .admin-sync-legacy-theme main > div > section div[class*="rounded-"][class*="border"] {
            border-color: rgba(255,255,255,0.08) !important;
          }
          .admin-sync-legacy-theme article {
            background: rgba(0,0,0,0.35) !important;
          }
          .admin-sync-legacy-theme main > div > section:first-child a[href="/admin"] {
            height: 2.75rem !important;
            padding: 0 1rem !important;
            background: rgba(255,255,255,0.08) !important;
            color: rgba(255,255,255,0.72) !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
            box-shadow: none !important;
            font-size: 0 !important;
            line-height: 1 !important;
          }
          .admin-sync-legacy-theme main > div > section:first-child a[href="/admin"]::after {
            content: 'Admin';
            font-size: 0.75rem;
            font-weight: 900;
          }
          .admin-sync-legacy-theme main > div > section:first-child a[href="/admin"]:hover {
            background: rgba(255,255,255,0.12) !important;
            color: #fff !important;
          }
        `}</style>
        <AdminSyncCenter />
      </div>
    </AdminAuthGuard>
  );
}
