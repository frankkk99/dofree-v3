'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { categoryChips, navItems } from '@/lib/catalog';
import type { HomePayload, MovieItem } from '@/lib/tmdb';
import { MovieCard } from '@/components/movie-card';
import { DetailWindow, SearchWindow } from '@/components/window-system';

const categoryIcons = ['▣', '◎', '▤', '◈', '♡', '☻', '◐', '⊘', '✺', '▥'];

function titleForHero(item: MovieItem) {
  if (!item.title) return 'เงามรณะ';
  return item.title.length > 14 ? item.title.slice(0, 13) : item.title;
}

function ctaLabel(item: MovieItem) {
  if (item.watchUrl) return 'รับชมหนัง';
  if (item.trailerUrl) return 'ดูตัวอย่าง';
  return 'ยังไม่มีลิงก์รับชม';
}

function uniqueMovies(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(`${item.mediaType}-${item.id}`, item);
  return [...map.values()];
}

export function HomeExperience({ home }: { home: HomePayload }) {
  const heroItems = useMemo(() => (home.heroItems?.length ? home.heroItems : [home.hero]), [home]);
  const allItems = useMemo(() => uniqueMovies([...heroItems, ...home.sections.flatMap((section) => section.items)]), [heroItems, home.sections]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [selected, setSelected] = useState<MovieItem | null>(null);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const hero = heroItems[heroIndex] || home.hero;
  const recommendationItems = home.sections[0]?.items || [];
  const recommendations = selected ? allItems.filter((movie) => `${movie.mediaType}-${movie.id}` !== `${selected.mediaType}-${selected.id}`).slice(0, 12) : allItems.slice(0, 12);

  useEffect(() => {
    if (heroItems.length > 1) setHeroIndex(Math.floor(Math.random() * heroItems.length));
  }, [heroItems.length]);

  useEffect(() => {
    if (heroItems.length <= 1) return;
    const timer = window.setInterval(() => setHeroIndex((current) => (current + 1) % heroItems.length), 7600);
    return () => window.clearInterval(timer);
  }, [heroItems.length]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchOpen(true);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#030303] text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-black/94 backdrop-blur-2xl">
        <nav className="mx-auto flex h-[58px] max-w-[1920px] items-center gap-3 px-4 sm:h-[68px] md:h-[76px] md:gap-6 md:px-6 xl:h-[88px] xl:gap-8 xl:px-7 2xl:px-8">
          <a href="/" className="flex shrink-0 items-center gap-1.5 text-[24px] font-black tracking-[-0.08em] text-[#e50914] sm:text-[28px] md:text-[34px] xl:text-[38px]">
            <span>DOFree</span>
            <span className="rounded bg-[#e50914] px-1 py-0.5 text-[9px] font-black tracking-normal text-white sm:text-[11px] md:rounded-md md:px-1.5 md:text-[13px]">v3</span>
          </a>

          <div className="hidden h-full items-center gap-9 text-[16px] font-bold text-white/62 xl:flex">
            {navItems.map((item, index) => (
              <a key={item} href={index === 0 ? '/' : '#sections'} className={`relative flex h-full items-center transition hover:text-white ${index === 0 ? 'text-[#e50914] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-[#e50914]' : ''}`}>{item}</a>
            ))}
          </div>

          <form onSubmit={submitSearch} className="ml-auto hidden w-[520px] max-w-[34vw] items-center gap-3 rounded-[18px] border border-white/[0.08] bg-white/[0.105] px-5 py-3.5 shadow-[0_20px_80px_rgba(0,0,0,0.5)] lg:flex">
            <span className="text-xl text-white/45">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setSearchOpen(true)} placeholder="ค้นหาภาพยนตร์, ซีรีส์, นักแสดง" className="w-full bg-transparent text-[15px] font-semibold text-white outline-none placeholder:text-white/40" />
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-3 md:gap-5 lg:ml-0">
            <a href="/watch-ready" className="hidden items-center gap-2 text-[15px] font-black text-[#f6c56b] md:flex"><span>♛</span><span>พรีเมียม</span></a>
            <button onClick={() => setSearchOpen(true)} className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-lg text-white/84 lg:hidden" aria-label="ค้นหา">⌕</button>
            <span className="hidden text-xl text-white/80 md:block">♧</span>
            <a href="/admin" className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-[#e50914]/70 bg-[#170203] shadow-glow md:h-12 md:w-12"><span className="text-[11px] font-black text-red-100 md:text-sm">A</span></a>
            <span className="hidden text-white/55 md:block">⌄</span>
          </div>
        </nav>
      </header>

      <section className="relative min-h-[500px] border-b border-white/[0.08] pt-[58px] sm:min-h-[545px] sm:pt-[68px] md:min-h-[585px] md:pt-[76px] xl:min-h-[610px] xl:pt-[88px]">
        <div className="absolute inset-0 overflow-hidden">
          {heroItems.map((item, index) => <div key={`${item.mediaType}-${item.id}-${index}`} className={`absolute inset-y-0 right-0 w-full bg-cover bg-center transition duration-1000 sm:w-[88%] md:w-[78%] ${index === heroIndex ? 'opacity-85 scale-100 md:opacity-95' : 'opacity-0 scale-105'}`} style={{ backgroundImage: `url(${item.backdropUrl})` }} />)}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#030303_0%,rgba(3,3,3,0.94)_24%,rgba(16,0,0,0.7)_52%,rgba(0,0,0,0.28)_78%,#030303_100%)] md:bg-[linear-gradient(90deg,#030303_0%,#080101_18%,rgba(16,0,0,0.68)_39%,rgba(0,0,0,0.2)_70%,#030303_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.12)_45%,#030303_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_42%,rgba(229,9,20,0.34),transparent_18rem),radial-gradient(circle_at_70%_18%,rgba(229,9,20,0.13),transparent_18rem)] md:bg-[radial-gradient(circle_at_22%_45%,rgba(229,9,20,0.28),transparent_25rem),radial-gradient(circle_at_58%_20%,rgba(229,9,20,0.16),transparent_22rem)]" />
        </div>

        <button onClick={() => setHeroIndex((heroIndex - 1 + heroItems.length) % heroItems.length)} aria-label="previous" className="absolute left-8 top-1/2 z-20 hidden h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-white/18 bg-black/28 text-4xl text-white/84 backdrop-blur-xl transition hover:bg-white/10 md:grid">‹</button>
        <button onClick={() => setHeroIndex((heroIndex + 1) % heroItems.length)} aria-label="next" className="absolute right-8 top-1/2 z-20 hidden h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-white/18 bg-black/28 text-4xl text-white/84 backdrop-blur-xl transition hover:bg-white/10 md:grid">›</button>

        <div className="relative z-10 mx-auto flex min-h-[442px] max-w-[1920px] flex-col justify-end px-4 pb-9 sm:min-h-[477px] sm:px-5 sm:pb-11 md:min-h-[509px] md:justify-center md:px-7 md:pb-0 xl:min-h-[522px] 2xl:px-8">
          <div className="max-w-[680px] md:ml-[6vw] xl:ml-[10vw] xl:max-w-[760px]">
            <p className="mb-3 text-[13px] font-black text-[#e50914] sm:text-[15px] md:mb-5 md:text-[22px]">{hero.status === 'published' ? 'ภาพยนตร์พร้อมรับชม' : 'ภาพยนตร์มาใหม่'}</p>
            <h1 className="hero-title max-w-[92vw] text-[42px] font-black leading-[0.88] tracking-[-0.085em] text-white sm:text-[52px] md:whitespace-nowrap md:text-[92px] lg:text-[112px] xl:text-[120px]">{titleForHero(hero)}</h1>
            <h2 className="mt-3 max-w-[92vw] text-[16px] font-black tracking-[-0.04em] text-white sm:text-[18px] md:mt-6 md:text-[28px]">เมื่อความลับในอดีต... กลับมาทวงคืนทุกสิ่ง</h2>
            <p className="mt-2 line-clamp-3 max-w-[92vw] text-[12px] leading-5 text-white/56 sm:text-[13px] sm:leading-6 md:mt-3 md:max-w-[620px] md:text-[18px] md:leading-7">{hero.overview}</p>
            <div className="mt-5 flex flex-wrap gap-2.5 sm:gap-3 md:mt-8 md:gap-5">
              <button onClick={() => setSelected(hero)} className="inline-flex h-[42px] items-center gap-2 rounded-lg bg-[#e50914] px-5 text-[13px] font-black text-white shadow-glow transition hover:bg-red-500 md:h-[55px] md:gap-3 md:rounded-xl md:px-9 md:text-[16px]"><span className="text-base md:text-xl">▶</span>{ctaLabel(hero)}</button>
              <button onClick={() => setSelected(hero)} className="inline-flex h-[42px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.12] px-5 text-[13px] font-black text-white/86 transition hover:bg-white/[0.18] md:h-[55px] md:gap-3 md:rounded-xl md:px-8 md:text-[16px]"><span className="grid h-5 w-5 place-items-center rounded-full border border-white/60 text-[10px] md:h-6 md:w-6 md:text-xs">i</span>รายละเอียด</button>
            </div>
          </div>

          <div className="absolute bottom-20 left-1/2 hidden -translate-x-1/2 items-center gap-3 md:flex">
            {heroItems.slice(0, 8).map((item, index) => <button key={`${item.id}-${index}`} onClick={() => setHeroIndex(index)} aria-label={`hero ${index + 1}`} className={`h-3 w-3 rounded-full transition ${index === heroIndex ? 'bg-[#e50914] scale-110' : 'bg-white/45 hover:bg-white/75'}`} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1920px] border-b border-white/[0.08] bg-black px-4 md:px-7 2xl:px-8">
        <div className="movie-rail flex h-[60px] items-center gap-2.5 overflow-x-auto md:h-[82px] md:gap-7">
          {categoryChips.map((chip, index) => <a key={chip} href="#sections" className={`flex h-[40px] min-w-max items-center gap-2 rounded-full px-4 text-[12px] font-bold transition md:h-[54px] md:gap-3 md:px-7 md:text-[16px] ${index === 0 ? 'bg-[#8b0007]/90 text-[#ffb5b5]' : 'text-white/58 hover:bg-white/[0.06] hover:text-white'}`}><span className={`grid h-5 w-5 place-items-center text-[16px] md:h-7 md:w-7 md:text-[22px] ${index === 0 ? 'text-[#e50914]' : 'text-white/72'}`}>{categoryIcons[index % categoryIcons.length]}</span><span>{chip}</span></a>)}
        </div>
      </section>

      <section id="sections" className="mx-auto max-w-[1920px] space-y-8 bg-black px-4 py-5 md:space-y-12 md:px-7 md:py-8 2xl:px-8">
        <div id="watch-ready" className="relative">
          <div className="mb-3 flex items-center justify-between md:mb-6"><h2 className="text-[20px] font-black tracking-[-0.04em] md:text-[30px]">แนะนำสำหรับคุณ</h2><a href="/watch-ready" className="text-[12px] font-black text-white/50 hover:text-white md:text-[16px]">ดูทั้งหมด ›</a></div>
          <div className="auto-carousel relative overflow-hidden pb-3 md:pb-4"><div className="auto-carousel-track flex w-max">{[0, 1].map((round) => <div key={round} className="auto-carousel-group flex gap-2.5 pr-2.5 sm:gap-3 sm:pr-3 md:gap-5 md:pr-5" aria-hidden={round === 1}>{recommendationItems.slice(0, 12).map((item, index) => <MovieCard key={`recommended-${round}-${item.id}-${index}`} item={item} onSelect={setSelected} priorityBadge={index % 3 === 0 ? 'ใหม่' : index % 3 === 1 ? 'พรีเมียม' : undefined} />)}</div>)}</div></div>
        </div>

        {home.sections.slice(1).map((section) => <div key={section.slug} id={section.slug} className="relative"><div className="mb-3 flex items-center justify-between md:mb-6"><div><p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#e50914]/80 md:text-xs md:tracking-[0.34em]">{section.eyebrow}</p><h2 className="mt-0.5 text-[20px] font-black tracking-[-0.04em] md:mt-1 md:text-[30px]">{section.title}</h2></div><a href={`/${section.slug === 'series' ? 'search?q=series' : 'watch-ready'}`} className="text-[12px] font-black text-white/50 hover:text-white md:text-[16px]">ดูทั้งหมด ›</a></div><div className="movie-rail flex gap-2.5 overflow-x-auto pb-3 sm:gap-3 md:gap-5 md:pb-4">{section.items.slice(0, 12).map((item, index) => <MovieCard key={`${section.slug}-${item.id}-${index}`} item={item} onSelect={setSelected} priorityBadge={index % 4 === 0 ? 'ใหม่' : index % 4 === 1 ? 'พรีเมียม' : undefined} />)}</div></div>)}
      </section>

      {searchOpen ? <SearchWindow query={query} setQuery={setQuery} items={allItems} onClose={() => setSearchOpen(false)} onSelect={setSelected} /> : null}
      {selected ? <DetailWindow item={selected} recommendations={recommendations} onClose={() => setSelected(null)} onSelect={setSelected} /> : null}
    </main>
  );
}
