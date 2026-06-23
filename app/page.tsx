import { categoryChips, navItems } from '@/lib/catalog';
import { getHomePayload } from '@/lib/tmdb';
import { MovieCard } from '@/components/movie-card';

const categoryIcons = ['▣', '◎', '▤', '◈', '♡', '☻', '◐', '⊘', '✺', '▥'];
const heroDots = [0, 1, 2, 3, 4];

export default async function HomePage() {
  const home = await getHomePayload();
  const hero = home.hero;
  const recommendationItems = home.sections[0]?.items || [];
  const recommendationCarouselItems = recommendationItems.slice(0, 10);
  const heroTitle = hero.title && hero.title.length <= 8 ? hero.title : 'เงามรณะ';
  const heroOverview =
    hero.overview && hero.overview.length <= 120
      ? hero.overview
      : 'การเดินทางของชายคนหนึ่ง สู่ความจริงที่อาจทำลายทุกคนที่เขารัก';

  return (
    <main className="min-h-screen overflow-hidden bg-[#030303] text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-black/94 backdrop-blur-2xl">
        <nav className="mx-auto flex h-[88px] max-w-[1920px] items-center gap-8 px-7 2xl:px-8">
          <a href="#" className="flex shrink-0 items-center gap-2 text-[31px] font-black tracking-[-0.08em] text-[#e50914] md:text-[38px]">
            <span>DOFree</span>
            <span className="rounded-md bg-[#e50914] px-1.5 py-0.5 text-[13px] font-black tracking-normal text-white">v3</span>
          </a>

          <div className="hidden h-full items-center gap-9 text-[16px] font-bold text-white/62 xl:flex">
            {navItems.map((item, index) => (
              <a key={item} href="#sections" className={`relative flex h-full items-center transition hover:text-white ${index === 0 ? 'text-[#e50914] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-[#e50914]' : ''}`}>
                {item}
              </a>
            ))}
          </div>

          <form className="ml-auto hidden w-[520px] max-w-[34vw] items-center gap-3 rounded-[18px] border border-white/[0.08] bg-white/[0.105] px-5 py-3.5 shadow-[0_20px_80px_rgba(0,0,0,0.5)] lg:flex">
            <span className="text-xl text-white/45">⌕</span>
            <input
              aria-label="ค้นหาภาพยนตร์"
              className="w-full bg-transparent text-[15px] font-semibold text-white outline-none placeholder:text-white/40"
              placeholder="ค้นหาภาพยนตร์, ซีรีส์, นักแสดง"
            />
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-5 lg:ml-0">
            <a href="#watch-ready" className="hidden items-center gap-2 text-[15px] font-black text-[#f6c56b] md:flex">
              <span>♛</span>
              <span>พรีเมียม</span>
            </a>
            <span className="hidden text-xl text-white/80 md:block">♧</span>
            <a href="/admin" className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-[#e50914]/70 bg-[#170203] shadow-glow">
              <span className="text-sm font-black text-red-100">A</span>
            </a>
            <span className="hidden text-white/55 md:block">⌄</span>
          </div>
        </nav>
      </header>

      <section className="relative min-h-[610px] border-b border-white/[0.08] pt-[88px]">
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-y-0 right-0 w-[78%] bg-cover bg-center opacity-95"
            style={{ backgroundImage: `url(${hero.backdropUrl})` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#030303_0%,#080101_18%,rgba(16,0,0,0.68)_39%,rgba(0,0,0,0.2)_70%,#030303_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.1)_0%,rgba(0,0,0,0.04)_44%,#030303_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_45%,rgba(229,9,20,0.28),transparent_25rem),radial-gradient(circle_at_58%_20%,rgba(229,9,20,0.16),transparent_22rem)]" />
          <div className="absolute inset-0 opacity-45 mix-blend-screen bg-[url('data:image/svg+xml,%3Csvg width=%2280%22 height=%2280%22 viewBox=%220 0 80 80%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.03%22%3E%3Ccircle cx=%221%22 cy=%221%22 r=%221%22/%3E%3C/g%3E%3C/svg%3E')]" />
        </div>

        <button aria-label="previous" className="absolute left-8 top-1/2 z-20 grid h-13 w-13 -translate-y-1/2 place-items-center rounded-full border border-white/18 bg-black/28 text-4xl text-white/84 backdrop-blur-xl transition hover:bg-white/10 md:h-14 md:w-14">‹</button>
        <button aria-label="next" className="absolute right-8 top-1/2 z-20 grid h-13 w-13 -translate-y-1/2 place-items-center rounded-full border border-white/18 bg-black/28 text-4xl text-white/84 backdrop-blur-xl transition hover:bg-white/10 md:h-14 md:w-14">›</button>

        <div className="relative z-10 mx-auto flex min-h-[522px] max-w-[1920px] flex-col justify-center px-7 2xl:px-8">
          <div className="ml-[8.5vw] max-w-[760px] xl:ml-[10vw]">
            <p className="mb-5 text-[18px] font-black text-[#e50914] md:text-[22px]">ภาพยนตร์มาใหม่</p>
            <h1 className="hero-title whitespace-nowrap text-[72px] font-black leading-[0.82] tracking-[-0.09em] text-white md:text-[104px] lg:text-[120px]">
              {heroTitle}
            </h1>
            <h2 className="mt-6 text-[22px] font-black tracking-[-0.04em] text-white md:text-[28px]">
              เมื่อความลับในอดีต... กลับมาทวงคืนทุกสิ่ง
            </h2>
            <p className="mt-3 max-w-[620px] text-[16px] leading-7 text-white/56 md:text-[18px]">
              {heroOverview}
            </p>
            <div className="mt-8 flex flex-wrap gap-5">
              <a href="#watch-ready" className="inline-flex h-[55px] items-center gap-3 rounded-xl bg-[#e50914] px-9 text-[16px] font-black text-white shadow-glow transition hover:bg-red-500">
                <span className="text-xl">▶</span>
                รับชมตอนนี้
              </a>
              <a href="#sections" className="inline-flex h-[55px] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.12] px-8 text-[16px] font-black text-white/86 transition hover:bg-white/[0.18]">
                <span className="grid h-6 w-6 place-items-center rounded-full border border-white/60 text-xs">i</span>
                รายละเอียด
              </a>
            </div>
          </div>

          <div className="absolute bottom-20 left-1/2 hidden -translate-x-1/2 items-center gap-3 md:flex">
            {heroDots.map((dot) => (
              <span key={dot} className={`h-3 w-3 rounded-full ${dot === 0 ? 'bg-[#e50914]' : 'bg-white/45'}`} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1920px] border-b border-white/[0.08] bg-black px-7 2xl:px-8">
        <div className="movie-rail flex h-[82px] items-center gap-7 overflow-x-auto">
          {categoryChips.map((chip, index) => (
            <a
              key={chip}
              href="#sections"
              className={`flex h-[54px] min-w-max items-center gap-3 rounded-full px-7 text-[16px] font-bold transition ${index === 0 ? 'bg-[#8b0007]/90 text-[#ffb5b5]' : 'text-white/58 hover:bg-white/[0.06] hover:text-white'}`}
            >
              <span className={`grid h-7 w-7 place-items-center text-[22px] ${index === 0 ? 'text-[#e50914]' : 'text-white/72'}`}>{categoryIcons[index % categoryIcons.length]}</span>
              <span>{chip}</span>
            </a>
          ))}
        </div>
      </section>

      <section id="sections" className="mx-auto max-w-[1920px] space-y-12 bg-black px-7 py-8 2xl:px-8">
        <div id="watch-ready" className="relative">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-[25px] font-black tracking-[-0.04em] md:text-[30px]">แนะนำสำหรับคุณ</h2>
            <a href="#" className="text-[16px] font-black text-white/50 hover:text-white">ดูทั้งหมด ›</a>
          </div>
          <div className="auto-carousel relative overflow-hidden pb-4">
            <div className="auto-carousel-track flex w-max">
              <div className="auto-carousel-group flex gap-4 pr-4 md:gap-5 md:pr-5">
                {recommendationCarouselItems.map((item, index) => (
                  <MovieCard key={`recommended-a-${item.id}-${index}`} item={item} priorityBadge={index % 3 === 0 ? 'ใหม่' : index % 3 === 1 ? 'พรีเมียม' : undefined} />
                ))}
              </div>
              <div className="auto-carousel-group flex gap-4 pr-4 md:gap-5 md:pr-5" aria-hidden="true">
                {recommendationCarouselItems.map((item, index) => (
                  <MovieCard key={`recommended-b-${item.id}-${index}`} item={item} priorityBadge={index % 3 === 0 ? 'ใหม่' : index % 3 === 1 ? 'พรีเมียม' : undefined} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {home.sections.slice(1).map((section) => (
          <div key={section.slug} id={section.slug} className="relative">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.34em] text-[#e50914]/80">{section.eyebrow}</p>
                <h2 className="mt-1 text-[25px] font-black tracking-[-0.04em] md:text-[30px]">{section.title}</h2>
              </div>
              <a href="#" className="text-[16px] font-black text-white/50 hover:text-white">ดูทั้งหมด ›</a>
            </div>
            <div className="movie-rail flex gap-4 overflow-x-auto pb-4 md:gap-5">
              {section.items.slice(0, 12).map((item, index) => <MovieCard key={`${section.slug}-${item.id}-${index}`} item={item} priorityBadge={index % 4 === 0 ? 'ใหม่' : index % 4 === 1 ? 'พรีเมียม' : undefined} />)}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
