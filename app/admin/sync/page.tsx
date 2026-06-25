import type { Metadata } from 'next';
import { AdminTmdbSyncPanel } from '@/components/admin-tmdb-sync-panel';
import { privatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = privatePageMetadata('Admin Sync');

export default function AdminSyncPage() {
  return <AdminTmdbSyncPanel />;
}
