import type { Metadata } from 'next';
import { AdminAccessControlPanel } from '@/components/admin-access-control-panel';
import { AdminAuthGuard } from '@/components/admin-auth-guard';
import { AdminOwnerGuard } from '@/components/admin-owner-guard';

export const metadata: Metadata = {
  title: 'Access Control | Admin',
  description: 'จัดการ Role, Permission และสิทธิ์การใช้งานระบบหลังบ้าน',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminAccessControlPage() {
  return (
    <AdminAuthGuard>
      <AdminOwnerGuard>
        <main className="admin-shell min-h-screen scroll-smooth text-white">
          <AdminAccessControlPanel />
        </main>
      </AdminOwnerGuard>
    </AdminAuthGuard>
  );
}
