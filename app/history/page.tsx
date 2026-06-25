import type { Metadata } from 'next';
import { BackLink } from '@/components/back-link';
import { HistoryPanel } from '@/components/history-panel';
import { privatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = privatePageMetadata('ประวัติการรับชม');

export default function HistoryPage() {
  return (
    <main className="min-h-screen bg-[#030303] px-4 py-24 text-white md:px-8">
      <BackLink />
      <section className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.55)] md:p-10">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#e50914]/85">Continue Watching</p>
        <h1 className="mt-3 text-[36px] font-black tracking-[-0.07em] md:text-[64px]">ประวัติการรับชม</h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/48 md:text-base">
          ดูรายการที่เปิดล่าสุดและกลับมาดูต่อได้ง่าย ประวัติจะผูกกับบัญชีที่ล็อกอินอยู่
        </p>

        <HistoryPanel />
      </section>
    </main>
  );
}
