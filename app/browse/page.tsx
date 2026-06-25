import type { Metadata } from 'next';
import { browseRoutes } from '@/lib/browse';
import { publicPageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...publicPageMetadata({
    title: 'หมวดหมู่หนังและซีรีส์',
    description: 'เลือกดูหมวดหมู่หนังและซีรีส์บนดูดีดี ทั้งหนังใหม่ หนังไทย ซีรีส์ หนังคะแนนสูง และรายการพร้อมรับชม',
    path: '/browse',
    keywords: ['หมวดหมู่หนัง', 'หมวดหมู่ซีรีส์', 'เลือกดูหนัง'],
  }),
};

export default function BrowseIndexPage() {
  return (
    <main className="min-h-screen bg-[#030303] px-4 py-20 text-white md:px-8">
      <section className="mx-auto max-w-6xl">
        <a href="/" className="text-sm font-black text-red-200/75 hover:text-red-100">กลับหน้าแรก</a>
        <p className="mt-8 text-[11px] font-black uppercase tracking-[0.28em] text-[#e50914]/85">Browse</p>
        <h1 className="mt-3 text-[40px] font-black tracking-[-0.07em] md:text-[72px]">หมวดหมู่</h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/52 md:text-base">
          เลือกเส้นทางที่อยากดู แล้วเข้าไปเจอรายการเต็มของหมวดนั้นได้ทันที
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {browseRoutes.map((route) => (
            <a
              key={route.slug}
              href={`/browse/${route.slug}`}
              className="rounded-[8px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.42)] transition hover:border-[#e50914]/70 hover:bg-[#170203]"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e50914]/85">{route.eyebrow}</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">{route.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/48">{route.description}</p>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
