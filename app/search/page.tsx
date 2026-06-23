import type { Metadata } from 'next';
import { MovieCard } from '@/components/movie-card';
import { searchMovies } from '@/lib/tmdb';

type SearchProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'ค้นหาภาพยนตร์และซีรีส์',
  description: 'ค้นหาภาพยนตร์ ซีรีส์ และข้อมูลจาก TMDB บน DOFree v3',
};

export default async function SearchPage({ searchParams }: SearchProps) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q : '';
  const items = await searchMovies(q);

  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <section className="mx-auto max-w-[1440px] px-6 py-20">
        <a href="/" className="text-sm font-black text-red-200/75 hover:text-red-100">← กลับหน้าแรก</a>
        <h1 className="mt-8 text-5xl font-black tracking-[-0.08em] md:text-7xl">ค้นหา</h1>
        <form className="mt-8 flex max-w-2xl gap-3 rounded-[18px] border border-white/10 bg-white/[0.08] p-2" action="/search">
          <input name="q" defaultValue={q} placeholder="ค้นหาภาพยนตร์, ซีรีส์, นักแสดง" className="flex-1 bg-transparent px-4 text-base font-bold text-white outline-none placeholder:text-white/35" />
          <button className="rounded-xl bg-[#e50914] px-6 py-3 text-sm font-black text-white">ค้นหา</button>
        </form>
        <p className="mt-5 text-white/45">{q ? `ผลการค้นหา “${q}” ${items.length} รายการ` : 'พิมพ์ชื่อเรื่องเพื่อเริ่มค้นหา'}</p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item, index) => <MovieCard key={`${item.mediaType}-${item.id}-${index}`} item={item} compact priorityBadge={index < 3 ? 'ใหม่' : undefined} />)}
        </div>
      </section>
    </main>
  );
}
