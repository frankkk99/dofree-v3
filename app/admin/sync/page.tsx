import type { Metadata } from 'next';
import { AdminAuthGuard } from '@/components/admin-auth-guard';
import { AdminSyncCenterV2 } from '@/components/admin-sync-center-v2';

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
      <div className="admin-sync-floating-glass-theme">
        <style>{`
          .admin-sync-floating-glass-theme main {
            background:
              radial-gradient(circle at 16% 0%, rgba(255,255,255,0.075), transparent 30rem),
              radial-gradient(circle at 86% 16%, rgba(229,9,20,0.08), transparent 26rem),
              linear-gradient(180deg, #050505 0%, #090909 42%, #050505 100%) !important;
          }
          .admin-sync-floating-glass-theme main > div > section,
          .admin-sync-floating-glass-theme main > div > div[class*="rounded-"] {
            border-color: rgba(255,255,255,0.075) !important;
            background: rgba(0,0,0,0.38) !important;
            box-shadow: 0 24px 100px rgba(0,0,0,0.56), inset 0 1px 0 rgba(255,255,255,0.055) !important;
            backdrop-filter: blur(24px);
          }
          .admin-sync-floating-glass-theme main > div > section:first-child {
            background: linear-gradient(135deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018)) !important;
            border-color: rgba(255,255,255,0.07) !important;
          }
          .admin-sync-floating-glass-theme article,
          .admin-sync-floating-glass-theme label,
          .admin-sync-floating-glass-theme main div[class*="rounded-"][class*="border"] {
            border-color: rgba(255,255,255,0.075) !important;
            background-color: rgba(255,255,255,0.035) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.035) !important;
          }
          .admin-sync-floating-glass-theme button,
          .admin-sync-floating-glass-theme a {
            box-shadow: none !important;
          }
          .admin-sync-floating-glass-theme button[class*="bg-[#e50914]"],
          .admin-sync-floating-glass-theme button[class*="bg-red"],
          .admin-sync-floating-glass-theme a[class*="bg-[#e50914]"] {
            background: rgba(184,7,16,0.9) !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
          }
          .admin-sync-floating-glass-theme button[class*="bg-amber"],
          .admin-sync-floating-glass-theme button[class*="bg-emerald"] {
            background: rgba(255,255,255,0.88) !important;
            color: #050505 !important;
            border: 1px solid rgba(255,255,255,0.14) !important;
          }
          .admin-sync-floating-glass-theme input,
          .admin-sync-floating-glass-theme select {
            border-color: rgba(255,255,255,0.09) !important;
            background: rgba(0,0,0,0.36) !important;
          }
          .admin-sync-floating-glass-theme h1,
          .admin-sync-floating-glass-theme h2,
          .admin-sync-floating-glass-theme h3 {
            letter-spacing: -0.045em;
          }
          .admin-sync-floating-glass-theme p[class*="text-[#ff3b45]"],
          .admin-sync-floating-glass-theme p[class*="text-[#ff6b72]"],
          .admin-sync-floating-glass-theme span[class*="text-[#ff6b72]"] {
            color: rgba(255,255,255,0.42) !important;
          }
        `}</style>
        <AdminSyncCenterV2 />
      </div>
    </AdminAuthGuard>
  );
}
