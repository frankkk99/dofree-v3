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
      <AdminSyncCenterV2 />
    </AdminAuthGuard>
  );
}
