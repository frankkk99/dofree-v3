import type { Metadata } from 'next';
import { AdminAuthGuard } from '@/components/admin-auth-guard';
import { AdminMembershipsPanel } from '@/components/admin-memberships-panel';

export const metadata: Metadata = {
  title: 'Admin Memberships | DOFree',
  description: 'Manage DOFree premium memberships',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminMembershipsPage() {
  return (
    <AdminAuthGuard>
      <main className="min-h-screen bg-[#030303] text-white">
        <AdminMembershipsPanel />
      </main>
    </AdminAuthGuard>
  );
}
