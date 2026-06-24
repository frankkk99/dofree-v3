import type { Metadata } from 'next';
import { AdminCmsDashboardClean } from '@/components/admin-cms-dashboard-clean';

export const metadata: Metadata = {
  title: 'Admin CMS Dashboard',
  description: 'หน้าแดชบอร์ดสำหรับจัดการคอนเทนต์ ลิงก์รับชม หมวดหมู่ และสถานะของ DOFree v3',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminCmsDashboardClean />;
}
