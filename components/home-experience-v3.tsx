'use client';

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { categoryChips } from '@/lib/catalog';
import type { HomePayload, MovieItem } from '@/lib/tmdb';
import { MovieCard } from '@/components/movie-card';
import { DetailWindow } from '@/components/window-system';

function uniqueMovies(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(`${item.mediaType}-${item.id}`, item);
  return [...map.values()];
}

function shortTitle(item: MovieItem) {
  return item.title.length > 14 ? item.title.slice(0, 13) : item.title;
}

function ctaLabel(item: MovieItem) {
  if (item.watchUrl) return 'รับชมหนัง';
  if (item.trailerUrl) return 'ดูตัวอย่าง';
  return 'รายละเอียด';
}

function matchQuery(item: MovieItem, query: string) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return true;
  return [item.title, item.titleEn, item.year, item.language, item.mediaType, ...(item.genres || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(keyword);
}

function matchCategory(item: MovieItem, category: string | null) {
  if (!category || category === 'ทั้งหมด') return true;
  return (item.genres || []).some((genre) => genre.includes(category) || category.includes(genre));
}

export function HomeExperienceV3({ home }: { home: HomePayload }) {
  const heroItems = useMemo(() => (home.heroItems?.length ? home.heroItems : [home.hero]), [home]);
  const allItems = useMemo(() => uniqueMovies([...heroItems, ...home.sections.flatMap((section) => section.items)]), [heroItems, home.sections]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [selected, setSelected] = useState<MovieItem | null>(null);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const hero = heroItems[heroIndex] || home.hero;
  const filterMode = Boolean(query.trim()) || Boolean(activeCategory);
  const filteredItems = useMemo(
    () => allItems.filter((item) => matchQuery(item, query) && matchCategory(item, activeCategory)),
    [activeCategory, allItems, query]
  );
  const recommendations = selected
    ? allItems.filter((movie) => `${movie.mediaType}-${movie.id}` !== `${selected.mediaType}-${selected.id}`).slice(0, 12)
    : allItems.slice(0, 12);

  function jumpToResults() {
    window.requestAnimationFrame(() => document.getElementById('sections')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim() && !activeCategory) setActiveCategory('ทั้งหมด');
    jumpToResults();
  }

  function chooseCategory(chip: string) {
    setActiveCategory(chip);
    jumpToResults();
  }

  function clearFilters() {
    setQuery('');
    setActiveCategory(null);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#030303] text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-black/88 backdrop-blur-2xl">
        <nav className="mx-auto flex h-[58px] max-w-[1920px] items-center px-4 md:h-[76px] md:px-7 xl:h-[88px]">
          <a href="/" className="flex items-center gap-1.5 text-[24px] font-black tracking-[-0.08em] text-[#e50914] md:text-[34px] xl:text-[38px]">
            <span>DOFree</span>
            <span className="rounded bg-[#e50914] px-1 py-0.5 text-[9px] font-black tracking-normal text-white md:rounded-md md:px-1.5 md:text-[13px]">v3</span>
          </a>
          <div className="ml-auto flex items-center gap-3 md:gap-5">
            <a href="/watch-ready" className="hidden text-[15px] font-black text-[#f6c56b] md:block">♛ พรีเมียม</a>
            <a href="/admin" className="grid h-9 w-9 place-items-center rounded-full border border-[#e50914]/70 bg-[#170203] shadow-glow md:h-12 md:w-12">
              <span className="text-[11px] font-black text-red-100 md:text-sm">A</span>
            </a>
          </div>
        </nav>
      </header>

      <section className="relative min-h-[500px] border-b border-white/[0.08] pt-[58px] md:min-h-[585px] md:pt-[76px] xl:min-h-[610px] xl:pt-[88px]">
        <div className="absolute inset-0 overflow-hidden">
          {heroItems.map((item, index) => (
            <div
              key={`${item.mediaType}-${item.id}-${index}`}
              className={`absolute inset-y-0 right-0 w-full bg-cover bg-center transition duration-1000 md:w-[78%] ${index === heroIndex ? 'opacity-90' : 'opacity-0 scale-105'}`}
              style={{ backgroundImage: `url(${item.backdropUrl})` }}
            />
          ))}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#030303_0%,rgba(3,3,3,0.94)_24%,rgba(16,0,0,0.7)_52%,rgba(0,0,0,0.28)_78%,#030303_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06)_0%,rgba(0,0,0,0.10)_42%,#030303_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_42%,rgba(229,9,20,0.34),transparent_18rem)]" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[442px] max-w-[1920px] flex-col justify-end px-4 pb-9 md:min-h-[509px] md:justify-center md:px-7 md:pb-0">
          <div className="max-w-[680px] md:ml-[6vw] xl:ml-[10vw]">
            <p className="mb-3 text-[13px] font-black text-[#e50914] md:mb-5 md:text-[22px]">{hero.status === 'published' ? 'ภาพยนตร์พร้อมรับชม' : 'ภาพยนตร์มาใหม่'}</p>
            <h1 className="hero-title max-w-[92vw] text-[42px] font-black leading-[0.88] tracking-[-0.085em] text-white md:whitespace-nowrap md:text-[92px] lg:text-[112px] xl:text-[120px]">{shortTitle(hero)}</h1>
            <h2 className="mt-3 max-w-[92vw] text-[16px] font-black tracking-[-0.04em] text-white md:mt-6 md:text-[28px]">เมื่อความลับในอดีต... กลับมาทวงคืนทุกสิ่ง</h2>
            <p className="mt-2 line-clamp-3 max-w-[92vw] text-[12px] leading-5 text-white/56 md:mt-3 md:max-w-[620px] md:text-[18px] md:leading-7">{hero.overview}</p>
            <div className="mt-5 flex gap-2.5 md:mt-8 md:gap-5">
              <button onClick={() => setSelected(hero)} className="inline-flex h-[42px] items-center gap-2 rounded-lg bg-[#e50914] px-5 text-[13px] font-black text-white shadow-glow md:h-[55px] md:px-9 md:text-[16px]">▶ {ctaLabel(hero)}</button>
              <button onClick={() => setSelected(hero)} className="inline-flex h-[42px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.12] px-5 text-[13px] font-black text-white/86 md:h-[55px] md:px-8 md:text-[16px]">ⓘ รายละเอียด</button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-20 mx-auto -mt-5 max-w-[1920px] px-4 md:-mt-7 md:px-7">
        <div className="mx-auto max-w-[760px] rounded-[20px] bg-black/28 p-1.5 shadow-[0_22px_85px_rgba(0,0,0,0.72)] backdrop-blur-2xl md:max-w-[920px] md:rounded-[26px] md:p-2.5">
          <div className="rounded-[17px] bg-white/[0.055] p-1.5 backdrop-blur-xl md:rounded-[22px] md:p-2.5">
            <form onSubmit={onSubmit} className="flex h-8 items-center gap-1.5 rounded-[12px] bg-white/[0.105] px-2.5 text-white md:h-11 md:rounded-[16px] md:px-3.5">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหา" className="min-w-0 flex-1 bg-transparent text-[11px] font-bold text-white outline-none placeholder:text-white/50 md:text-[14px]" />
              {query ? <button type="button" onClick={() => setQuery('')} className="grid h-5 w-5 place-items-center rounded-full bg-black/28 text-[10px] text-white/80">×</button> : null}
              <button type="submit" className="rounded-full bg-white/[0.12] px-2 py-1 text-[9px] font-black text-white/72 md:px-3 md:text-[11px]">ค้นหา</button>
            </form>
            <div className="mt-1.5 flex max-h-[74px] flex-wrap gap-1 overflow-hidden md:mt-2 md:max-h-[92px] md:gap-1.5">
              {categoryChips.map((chip) => {
                const active = activeCategory === chip;
                return (
                  <button key={chip} type="button" onClick={() => chooseCategory(chip)} className={`inline-flex h-[21px] items-center rounded-full border px-2 text-[9px] font-black leading-none transition md:h-7 md:px-3 md:text-[11px] ${active ? 'border-[#e50914]/90 bg-[#e50914] text-white shadow-glow' : 'border-white/18 bg-white/[0.055] text-white/72 hover:border-white/30 hover:bg-white/[0.11] hover:text-white'}`}>
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="sections" className="mx-auto max-w-[1920px] bg-black px-4 py-6 md:px-7 md:py-8">
        {filterMode ? (
          <div>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]/80">ผลลัพธ์</p>
                <h2 className="mt-1 text-[21px] font-black tracking-[-0.05em] md:text-[34px]">{query.trim() ? `ค้นหา “${query.trim()}”` : activeCategory}</h2>
                <p className="mt-1 text-[11px] font-semibold text-white/44">พบ {filteredItems.length} เรื่อง</p>
              </div>
              <button onClick={clearFilters} className="rounded-full border border-white/12 bg-white/[0.08] px-3 py-2 text-[11px] font-black text-white/72 backdrop-blur-xl">ล้างค่า</button>
            </div>
            {filteredItems.length ? (
              <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-6 md:gap-4 lg:grid-cols-7 xl:grid-cols-8">
                {filteredItems.map((item, index) => <MovieCard key={`filter-${item.mediaType}-${item.id}-${index}`} item={item} onSelect={setSelected} grid priorityBadge={activeCategory && activeCategory !== 'ทั้งหมด' ? activeCategory : undefined} />)}
              </div>
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 text-center text-sm font-bold text-white/58">ไม่พบหนังที่ตรงกับเงื่อนไขนี้</div>
            )}
          </div>
        ) : (
          <div className="space-y-8 md:space-y-12">
            {home.sections.map((section, sectionIndex) => (
              <div key={section.slug} className="relative">
                <div className="mb-3 flex items-center justify-between md:mb-6">
                  <div>
                    {sectionIndex > 0 ? <p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#e50914]/80">{section.eyebrow}</p> : null}
                    <h2 className="text-[20px] font-black tracking-[-0.04em] md:text-[30px]">{sectionIndex === 0 ? 'แนะนำสำหรับคุณ' : section.title}</h2>
                  </div>
                  <a href="/watch-ready" className="text-[12px] font-black text-white/50 hover:text-white md:text-[16px]">ดูทั้งหมด ›</a>
                </div>
                <div className="movie-rail flex gap-2.5 overflow-x-auto pb-3 sm:gap-3 md:gap-5 md:pb-4">
                  {section.items.map((item, index) => <MovieCard key={`${section.slug}-${item.id}-${index}`} item={item} onSelect={setSelected} priorityBadge={index % 4 === 0 ? 'ใหม่' : index % 4 === 1 ? 'พรีเมียม' : undefined} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {filterMode ? <button type="button" onClick={clearFilters} className="fixed right-3 top-1/2 z-[60] -translate-y-1/2 rounded-full border border-white/18 bg-black/45 px-3 py-2 text-[11px] font-black text-white/86 shadow-[0_0_28px_rgba(229,9,20,0.44)] backdrop-blur-xl animate-pulse md:right-6 md:px-4 md:py-3 md:text-xs">ล้างค่า</button> : null}
      {selected ? <DetailWindow item={selected} recommendations={recommendations} onClose={() => setSelected(null)} onSelect={setSelected} /> : null}
    </main>
  );
}
