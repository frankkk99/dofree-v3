import { BackLink } from '@/components/back-link';

export default function HistoryPage() {
  return (
    <main className="min-h-screen bg-[#030303] px-4 py-24 text-white md:px-8">
      <BackLink />
      <section className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.55)] md:p-10">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#e50914]/85">Continue Watching</p>
        <h1 className="mt-3 text-[36px] font-black tracking-[-0.07em] md:text-[64px]">ประวัติการรับชม</h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/48 md:text-base">
          หน้านี้เตรียมไว้สำหรับดูต่อจากเรื่องที่เปิดล่าสุด จัดเก็บเวลาเล่นล่าสุด อุปกรณ์ที่ใช้ และสถานะดูจบ/ยังไม่จบ
        </p>

        <div className="mt-8 rounded-[24px] border border-white/10 bg-black/35 p-5">
          <h2 className="text-xl font-black tracking-[-0.04em]">โครงระบบที่ควรต่อ</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {['user_id', 'tmdb_id + media_type', 'watch_url', 'progress_seconds', 'duration_seconds', 'last_watched_at'].map((item) => (
              <div key={item} className="rounded-2xl bg-white/[0.055] px-4 py-3 text-sm font-bold text-white/72">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
