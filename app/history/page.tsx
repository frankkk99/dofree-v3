import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { HistoryPanel } from '@/components/history-panel';
import { PageHeroShell } from '@/components/page-hero-shell';

export const metadata: Metadata = pageMetadata({
  title: 'ประวัติการรับชม',
  description: 'ดูประวัติการรับชมล่าสุดและกลับมาต่อเนื้อหาที่เปิดไว้ในบัญชี DOFree v3',
  path: '/history',
});

export default function HistoryPage() {
  return (
    <PageHeroShell
      eyebrow="Continue Watching"
      title="ประวัติการรับชม"
      description="ดูรายการที่เปิดล่าสุดและกลับมาดูต่อได้ง่าย ประวัติจะผูกกับบัญชีที่ล็อกอินอยู่"
      maxWidth="max-w-5xl"
    >
      <HistoryPanel />
    </PageHeroShell>
  );
}
