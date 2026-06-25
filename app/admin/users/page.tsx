import type { Metadata } from 'next';
import { AdminAuthGuard } from '@/components/admin-auth-guard';
import { AdminUsersPanel } from '@/components/admin-users-panel';

export const metadata: Metadata = {
  title: 'Admin Users | DOFree',
  description: 'Manage DOFree users and roles',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminUsersPage() {
  return (
    <AdminAuthGuard>
      <main className="min-h-screen bg-[#030303] text-white">
        <AdminUsersPanel />
      </main>
    </AdminAuthGuard>
  );
}
