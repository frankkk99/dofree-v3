import { categoryChips, navItems } from '@/lib/catalog';
import { getHomePayload } from '@/lib/tmdb';
import { MovieCard } from '@/components/movie-card';

export default async function HomePage() {
  const home = await getHomePayload();
  const hero = home.hero;

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <section className="relative min-h-[760px] border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-65"
          style={{ backgroundImage: `url(${hero.backdropUrl})` }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_18%,rgba(229,9,20,0.2),transparent_24rem),linear-gradient(90deg,#050505_0%,rgba(5,5,5,0.86)_30%,rgba(5,5,5,0.42)_62%,#050505_100%)]" />
        <div className="absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-black/45 backdrop-blur-2xl">
          <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-red-600 text-xl font-black shadow-glow">D</div>
              <div>
                <div className="text-lg font-black tracking-tight">DOFree v3</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.35em] text-red-200/60">Movie Platform</div>
              </div>
            </div>
            <div className="hidden items-center gap-6 text-sm font-bold text-white/62 lg:flex">
              {navItems.map((item) => <a key={item} href="#sections" className="transition hover:text-white">{item}</a>)}
            </div>
            <div className="flex items-center gap-2">
              <a href="/admin" className="hidden rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white/72 hover:bg-white/15 md:block">Admin</a>
              <button className="rounded-full bg-red-600 px-5 py-2 text-xs font-black shadow-glow">Premium</button>
            </div>
          </nav>
        </div>

        <div className="relative z-10 mx-auto flex min-h-[760px] max-w-7xl flex-col justify-end px-4 pb-16 pt-32 md:px-8">
          <div className="max-w-3xl">
            <div className="mb-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em]">{hero.label || 'Featured'}</span>
              <span className="rounded-full bg-white px-4 py-1.5 text-xs font-black text-black">★ {hero.rating.toFixed(1)}</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-black text-white/75">{hero.year}</span>
            </div>
            <h1 className="text-5xl font-black leading-[0.92] tracking-[-0.08em] md:text-8xl">{hero.title}</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/68 md:text-lg">{hero.overview}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#watch-ready" className="rounded-2xl bg-red-600 px-7 py-4 text-center text-sm font-black shadow-glow transition hover:bg-red-500">รับชมตอนนี้</a>
              <a href="#sections" className="rounded-2xl border border-white/15 bg-white/10 px-7 py-4 text-center text-sm font-black text-white/78 transition hover:bg-white/15">ดูรายละเอียด</a>
            </div>
          </div>

          <div className="mt-12 max-w-3xl rounded-[2rem] border border-white/12 bg-black/45 p-3 shadow-2xl backdrop-blur-2xl md:p-4">
            <div className="flex items-center gap-3 rounded-[1.35rem] border border-white/10 bg-white/[0.07] px-5 py-4">
              <span className="text-xl">⌕</span>
              <input className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/35" placeholder="ค้นหาภาพยนตร์ ซีรีส์ หมวดหมู่ หรือคะแนน 8+" />
              <button className="rounded-xl bg-red-600 px-5 py-2 text-xs font-black">ค้นหา</button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-20 -mt-10 mx-auto max-w-7xl px-4 md:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-[#0d0d0d]/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="movie-rail flex gap-3 overflow-x-auto pb-1">
            {categoryChips.map((chip, index) => (
              <a key={chip} href="#sections" className="flex min-w-[104px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-center transition hover:border-red-500/60 hover:bg-red-600/15">
                <span className="text-2xl">{['◎', '⚡', '◈', '◆', '♡', '☻', '◐', '✦', '✺', '▣'][index % 10]}</span>
                <span className="mt-2 text-xs font-black text-white/72">{chip}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="sections" className="mx-auto max-w-7xl space-y-12 px-4 py-14 md:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ['Movie Discovery', 'ค้นหาและจัดหมวดหนังให้ดูง่ายเหมือนแพลตฟอร์มจริง'],
            ['Watch-ready First', 'ดันเรื่องที่พร้อมรับชมขึ้นก่อนเพื่อให้ผู้ใช้กดต่อได้ทันที'],
            ['SEO-ready Structure', 'วางฐานสำหรับหน้า Movie Detail, Sitemap และ Schema ต่อในเฟสถัดไป'],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-lg font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">{desc}</p>
            </div>
          ))}
        </div>

        {home.sections.map((section) => (
          <div key={section.slug} id={section.slug}>
            <div className="mb-5 flex flex-col justify-between gap-2 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-red-300/70">{section.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight md:text-4xl">{section.title}</h2>
                <p className="mt-2 max-w-2xl text-sm text-white/45">{section.description}</p>
              </div>
              <a href="#" className="text-sm font-black text-red-200/75 hover:text-red-100">ดูทั้งหมด →</a>
            </div>
            <div className="movie-rail flex gap-4 overflow-x-auto pb-3">
              {section.items.map((item) => <MovieCard key={`${section.slug}-${item.id}`} item={item} />)}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
