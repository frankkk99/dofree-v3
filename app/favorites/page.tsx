import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { FavoritesPanel } from '@/components/favorites-panel';
import { PageHeroShell } from '@/components/page-hero-shell';

export const metadata: Metadata = pageMetadata({
  title: 'รายการโปรด',
  description: 'หน้ารายการโปรดสำหรับเก็บภาพยนตร์และซีรีส์ที่ต้องการรับชมภายหลังบน DOFree v3',
  path: '/favorites',
});

export default function FavoritesPage() {
  return (
    <PageHeroShell
      eyebrow="My List"
      title="รายการโปรด"
      description="เก็บหนังและซีรีส์ที่อยากดูไว้ในบัญชีเดียว รายการนี้จะผูกกับบัญชีที่ล็อกอิน และซิงก์ข้ามอุปกรณ์ได้เมื่อระบบ auth เปิดใช้งานเต็มรูปแบบ"
    >
      <FavoritesPanel />
    </PageHeroShell>
  );
}
