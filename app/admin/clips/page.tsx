import type { Metadata } from 'next';
import { AdminAuthGuard } from '@/components/admin-auth-guard';

const plannedFields = [
  'YouTube URL',
  'ประเภทคลิป: Shorts / ตัวอย่าง / สรุปหนัง / สปอย / ฉากเด็ด',
  'หนังที่เกี่ยวข้อง / TMDB ID',
  'ภาษา: พากย์ไทย / ซับไทย / อังกฤษ / อื่น ๆ',
  'ระดับสปอย: ไม่มี / เล็กน้อย / หนัก',
  'แสดงหน้าแรก / แสดงหน้า Clips',
  'สถานะ Draft / Published / Hidden',
  'Sort order',
];

export const metadata: Metadata = {
  title: 'Admin Clips | DOFree',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminClipsPage() {
  return (
    <AdminAuthGuard>
      <main className="min-h-screen bg-[#050505] px-4 py-5 text-white md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl space-y-5">
          <section className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(229,9,20,0.24),transparent_24rem),rgba(255,255,255,0.04)] p-5 shadow-[0_30px_110px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.08)] md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ff3b45]">Coming Soon</p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.055em] md:text-5xl">จัดการ Clips / Spoil</h1>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/64 md:text-base">
                  หน้านี้เตรียมไว้สำหรับจัดการคลิปสั้น สรุปหนัง ตัวอย่าง และสปอย โดยแอดมินจะเปิด/ปิดการแสดงผลได้เหมือนคอนเทนต์ปกติ
                </p>
              </div>
              <div className="flex gap-2">
                <a href="/admin" className="inline-flex h-11 items-center rounded-2xl bg-white/[0.10] px-5 text-xs font-black text-white/76 ring-1 ring-white/10 hover:bg-white/[0.16] hover:text-white">กลับแอดมิน</a>
                <a href="/clips" className="inline-flex h-11 items-center rounded-2xl bg-[#e50914] px-5 text-xs font-black text-white shadow-[0_14px_34px_rgba(229,9,20,0.28)]">ดูหน้าบ้าน</a>
              </div>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[26px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_22px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#ff3b45]">Preview</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">ฟอร์มจัดการที่จะเพิ่ม</h2>
              <div className="mt-4 grid gap-2">
                {plannedFields.map((field) => (
                  <div key={field} className="rounded-2xl border border-white/10 bg-black/24 px-4 py-3 text-xs font-bold text-white/64">
                    {field}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[26px] border border-amber-300/18 bg-amber-300/[0.055] p-5 shadow-[0_22px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-100">Safety Rule</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">กฎ UX สำหรับคลิปสปอย</h2>
              <div className="mt-4 space-y-3 text-sm font-semibold leading-6 text-white/64">
                <p className="rounded-2xl bg-black/24 p-4 ring-1 ring-white/8">คลิปที่เป็นสปอยต้องมี overlay เตือนก่อนเสมอ และไม่ autoplay</p>
                <p className="rounded-2xl bg-black/24 p-4 ring-1 ring-white/8">แอดมินควรเลือกภาษาและระดับสปอยก่อน publish</p>
                <p className="rounded-2xl bg-black/24 p-4 ring-1 ring-white/8">คลิปจะใช้ YouTube embed เท่านั้น ไม่ดาวน์โหลดหรือเก็บไฟล์วิดีโอเอง</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </AdminAuthGuard>
  );
}
