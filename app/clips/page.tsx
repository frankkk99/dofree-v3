import type { Metadata } from 'next';
import { ClipsComingSoonSection } from '@/components/clips-coming-soon-section';

export const metadata: Metadata = {
  title: 'คลิปสั้นก่อนเลือกดู | ดูดีดี.online',
  description: 'ฟีเจอร์ใหม่สำหรับดูคลิปสั้น สรุปหนัง ตัวอย่าง และสปอยแบบกดเปิดเอง ก่อนเลือกเรื่องที่จะรับชมบนดูดีดี.online',
};

export default function ClipsPage() {
  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <header className="border-b border-white/10 bg-black/88 px-4 py-4 backdrop-blur-2xl md:px-7 md:py-5">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
          <a href="/" className="text-xl font-black tracking-[-0.06em] text-[#e50914] md:text-3xl">ดูดีดี.online</a>
          <a href="/" className="rounded-full bg-white/[0.08] px-4 py-2 text-xs font-black text-white/68 transition hover:bg-white/[0.14] hover:text-white">กลับหน้าแรก</a>
        </div>
      </header>

      <section className="mx-auto max-w-[1440px] px-4 pt-8 md:px-7 md:pt-12">
        <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(229,9,20,0.22),transparent_26rem),rgba(255,255,255,0.04)] p-5 shadow-[0_28px_100px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] md:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e50914]/90">New Feature</p>
          <h1 className="mt-2 max-w-4xl text-[34px] font-black leading-none tracking-[-0.07em] md:text-6xl">คลิปสั้นก่อนเลือกดู</h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/58 md:text-lg md:leading-8">
            พื้นที่ใหม่สำหรับ Shorts, ตัวอย่าง, สรุปหนัง, ฉากเด็ด และสปอยแบบมีคำเตือน เพื่อช่วยให้ผู้ใช้เลือกเรื่องที่อยากดูได้เร็วขึ้น
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-black text-white/60 md:text-xs">
            <span className="rounded-full bg-white/[0.08] px-3 py-2 ring-1 ring-white/10">เล่นในเว็บ</span>
            <span className="rounded-full bg-white/[0.08] px-3 py-2 ring-1 ring-white/10">กดเปิดสปอยเอง</span>
            <span className="rounded-full bg-white/[0.08] px-3 py-2 ring-1 ring-white/10">แอดมินเปิด/ปิดได้</span>
          </div>
        </div>
      </section>

      <ClipsComingSoonSection standalone />
    </main>
  );
}
