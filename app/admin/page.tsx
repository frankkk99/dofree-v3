import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminAuthGuard } from '@/components/admin-auth-guard';
import { AdminWorkspace } from '@/components/admin-workspace';

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
      <main className="admin-shell min-h-screen scroll-smooth text-white">
        <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8 text-sm font-black text-white/50 md:px-8">Loading admin workspace...</div>}>
          <AdminWorkspace />
        </Suspense>
      </main>
    </AdminAuthGuard>
  );
}
