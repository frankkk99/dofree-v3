import type { Metadata } from 'next';
import { AdminAuthGuard } from '@/components/admin-auth-guard';
import { AdminSeriesBulkManager } from '@/components/admin-series-bulk-manager';

export const metadata: Metadata = {
  title: 'Series Episodes Bulk Manager | DodeedeeV3 Admin',
  description: 'Bulk add and update TV series episodes in one admin page',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminSeriesPage() {
  return (
    <AdminAuthGuard>
      <main className="min-h-screen bg-[#030303] text-white">
        <AdminSeriesBulkManager />
      </main>
    </AdminAuthGuard>
  );
}
