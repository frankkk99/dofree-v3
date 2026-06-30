import type { Metadata } from 'next';
import { MovieCard } from '@/components/movie-card';
import { baseOpenGraph, indexRobots, safeDescription, siteName } from '@/lib/seo';
import { getWatchReadyItems } from '@/lib/tmdb';

export const metadata: Metadata = {
  title: 'หนังและซีรีส์พร้อมรับชม',
  description: safeDescription('รวมภาพยนตร์และซีรีส์ที่มีสถานะพร้อมรับชม คัดจากคะแนนสูง รายการแนะนำ และคอนเทนต์ยอดนิยมบนดูดีดี.online'),
  alternates: {
    canonical: '/watch-ready',
  },
  openGraph: {
    ...baseOpenGraph('/watch-ready'),
    title: `หนังและซีรีส์พร้อมรับชม | ${siteName}`,
    description: 'รวมภาพยนตร์และซีรีส์ที่มีสถานะพร้อมรับชมบนดูดีดี.online',
  },
  twitter: {
    card: 'summary_large_image',
    title: `หนังและซีรีส์พร้อมรับชม | ${siteName}`,
    description: 'รวมภาพยนตร์และซีรีส์ที่มีสถานะพร้อมรับชมบนดูดีดี.online',
  },
  robots: indexRobots(),
};

export default async function WatchReadyPage() {
  const items = await getWatchReadyItems();
  const movies = items.filter((item) => item.mediaType === 'movie');
  const series = items.filter((item) => item.mediaType === 'tv');

  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <section className="relative overflow-hidden border-b border-white/10 px-6 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(229,9,20,0.22),transparent_30rem),linear-gradient(180deg,#030303,#050000)]" />
        <div className="relative z-10 mx-auto max-w-[1440px]">
          <a href="/" className="text-sm font-black text-red-200/75 hover:text-red-100">← กลับหน้าแรก</a>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.34em] text-[#e50914]">Watch Ready</p>
          <h1 className="mt-3 text-5xl font-black tracking-[-0.08em] md:text-7xl">พร้อมรับชม</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-white/58">หน้ารวมเรื่องที่ถูกจัดสถานะพร้อมดู คัดจากหนัง/ซีรีส์ที่มีคะแนนสูงและเหมาะสำหรับผู้ชมที่อยากกดรับชมทันที</p>
          <div className="mt-8 flex flex-wrap gap-3 text-xs font-black text-white/65">
            <span className="rounded-full bg-[#e50914] px-4 py-2 text-white">ทั้งหมด {items.length}</span>
            <span className="rounded-full bg-white/10 px-4 py-2">ภาพยนตร์ {movies.length}</span>
            <span className="rounded-full bg-white/10 px-4 py-2">ซีรีส์ {series.length}</span>
            <span className="rounded-full bg-white/10 px-4 py-2">คะแนน 8+</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-10">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item, index) => (
            <MovieCard key={`${item.mediaType}-${item.id}-${index}`} item={item} compact priorityBadge={index % 5 === 0 ? 'พร้อมดู' : undefined} />
          ))}
        </div>
      </section>
    </main>
  );
}
