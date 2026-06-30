import type { Metadata } from 'next';
import { AdminAccessControlPanel } from '@/components/admin-access-control-panel';
import { AdminAuthGuard } from '@/components/admin-auth-guard';
import { AdminOwnerGuard } from '@/components/admin-owner-guard';

export const metadata: Metadata = {
  title: 'จัดการสิทธิ์หลังบ้าน | Admin',
  description: 'จัดการบทบาท สิทธิ์ และการเข้าถึงระบบหลังบ้าน',
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
