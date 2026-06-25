import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { AdminTmdbSyncPanel } from '@/components/admin-tmdb-sync-panel';

export const metadata: Metadata = pageMetadata({
  title: 'Admin TMDB Sync',
  description: 'เครื่องมือซิงก์ TMDB catalog สำหรับผู้ดูแล DOFree v3',
  path: '/admin/sync',
  noIndex: true,
});

export default function AdminSyncPage() {
  return <AdminTmdbSyncPanel />;
}
