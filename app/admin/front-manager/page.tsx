import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminAuthGuard } from '@/components/admin-auth-guard';
import { AdminFrontManager } from '@/components/admin-front-manager';

export const metadata: Metadata = {
  title: 'Admin Front Manager | DodeedeeV3',
  description: 'Admin mode for managing storefront cards without changing the public homepage.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminFrontManagerPage() {
  return (
    <AdminAuthGuard>
      <main className="admin-shell min-h-screen scroll-smooth text-white">
        <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8 text-sm font-black text-white/50 md:px-8">Loading admin front manager...</div>}>
          <AdminFrontManager />
        </Suspense>
      </main>
    </AdminAuthGuard>
  );
}
