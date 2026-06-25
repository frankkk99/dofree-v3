import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'CMS Dashboard',
  description: 'พื้นที่จัดการคอนเทนต์สำหรับทีม DOFree v3',
  path: '/cms',
  noIndex: true,
});

export default function CmsPage() {
  return <main className="min-h-screen bg-black p-8 text-white">CMS Dashboard</main>;
}
