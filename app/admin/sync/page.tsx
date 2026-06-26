import type { Metadata } from 'next';
import { AdminAuthGuard } from '@/components/admin-auth-guard';
import { AdminTmdbSyncPanel } from '@/components/admin-tmdb-sync-panel';

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
      <AdminTmdbSyncPanel />
    </AdminAuthGuard>
  );
}
