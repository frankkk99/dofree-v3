import type { Metadata } from 'next';
import { privatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = privatePageMetadata('ไม่พบหน้าที่ต้องการ');

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#030303] px-6 text-white">
      <section className="w-full max-w-xl rounded-[8px] border border-white/10 bg-white/[0.045] p-6 text-center shadow-[0_24px_90px_rgba(0,0,0,0.55)] md:p-8">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#e50914]/85">404</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.07em] md:text-6xl">ไม่พบหน้านี้</h1>
        <p className="mt-3 text-sm font-semibold leading-7 text-white/50">ลิงก์นี้อาจถูกย้ายหรือไม่มีรายการแล้ว ลองกลับไปค้นหาจากหน้าแรกหรือเลือกหมวดหมู่ทั้งหมด</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="/" className="rounded-xl bg-[#e50914] px-5 py-3 text-sm font-black text-white shadow-glow">
            กลับหน้าแรก
          </a>
          <a href="/browse" className="rounded-xl border border-white/10 bg-white/[0.08] px-5 py-3 text-sm font-black text-white/78 hover:bg-white/[0.13]">
            ดูหมวดหมู่
          </a>
        </div>
      </section>
    </main>
  );
}
