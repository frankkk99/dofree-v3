import type { Metadata } from 'next';
import { AdminAuthGuard } from '@/components/admin-auth-guard';

export const metadata: Metadata = {
  title: 'CMS | DOFree',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CmsPage() {
  return (
    <AdminAuthGuard>
      <main className="min-h-screen bg-black p-8 text-white">DodeedeeV3 CMS Dashboard</main>
    </AdminAuthGuard>
  );
}
