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
      <AdminSyncCenter />
    </AdminAuthGuard>
  );
}
