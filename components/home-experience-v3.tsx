'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { categoryChips } from '@/lib/catalog';
import type { HomePayload, MovieItem, MovieSection } from '@/lib/tmdb';
import { MovieCard } from '@/components/movie-card';
import { DetailWindow } from '@/components/window-system';

const RAIL_LOAD_STEP = 6;
const RAIL_LOAD_THRESHOLD = 360;

function uniqueMovies(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(`${item.mediaType}-${item.id}`, item);
  return [...map.values()];
}

function seededMovieScore(item: MovieItem, seed: number, scope: string, index: number) {
  const source = `${scope}:${seed}:${item.mediaType}:${item.id}:${index}`;
  let hash = 2166136261;

  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function shuffleMovies(items: MovieItem[], seed: number, scope: string) {
  if (!items.length) return items;

  return [...items]
    .map((item, index) => ({
      item,
      score: seededMovieScore(item, seed || 1, scope, index),
    }))
    .sort((a, b) => a.score - b.score)
    .map(({ item }) => item);
}

function shuffleSections(sections: MovieSection[], seed: number) {
  return sections.map((section, index) => ({
    ...section,
    items: shuffleMovies(section.items, seed + index + 11, section.slug),
  }));
}

function shortTitle(item: MovieItem) {
  return item.title.length > 14 ? item.title.slice(0, 13) : item.title;
}

function itemSearchText(item: MovieItem) {
  return [
    item.title,
    item.titleEn,
    item.year,
    item.language,
    item.mediaType,
    item.status,
    item.label,
    ...(item.genres || []),
    ...(item.badges || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function matchQuery(item: MovieItem, query: string) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return true;
  return itemSearchText(item).includes(keyword);
}

function matchCategory(item: MovieItem, category: string | null) {
  if (!category || category === 'ทั้งหมด') return true;

  const genres = (item.genres || []).join(' ').toLowerCase();
  const badges = (item.badges || []).join(' ').toLowerCase();
  const status = (item.status || '').toLowerCase();
  const label = (item.label || '').toLowerCase();
  const language = (item.language || '').toLowerCase();
  const year = Number(item.year);
  const currentYear = new Date().getFullYear();

  switch (category) {
    case 'หนังไทย':
      return language === 'th' || genres.includes('ไทย');
    case 'หนังฝรั่ง':
      return language === 'en' || language === 'us';
    case 'พากย์ไทย':
      return language === 'th' || badges.includes('พากย์ไทย') || label.includes('พากย์ไทย');
    case 'ซับไทย':
      return badges.includes('ซับไทย') || label.includes('ซับไทย') || (language !== 'th' && Boolean(language));
    case 'พร้อมดู':
      return Boolean(item.isWatchReady || item.watchUrl || status === 'published');
    case 'คะแนนสูง':
      return item.rating >= 8;
    case 'หนังใหม่':
      return badges.includes('ใหม่') || label.includes('ใหม่') || year >= currentYear - 1;
    case 'HD':
      return badges.includes('hd') || label.includes('hd');
    case 'ZOOM':
      return badges.includes('zoom') || label.includes('zoom') || status === 'review';
    case 'ภาพยนตร์':
      return item.mediaType === 'movie';
    case 'ซีรีส์':
      return item.mediaType === 'tv';
    default:
      return (item.genres || []).some((genre) => genre.includes(category) || category.includes(genre));
  }
}

function useLazyMount(initiallyMounted = false, rootMargin = '420px') {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(initiallyMounted);

  useEffect(() => {
    if (mounted) return;

    if (typeof IntersectionObserver === 'undefined') {
      setMounted(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [mounted, rootMargin]);

  return { ref, mounted };
}

function RailSkeleton() {
  return (
    <div className="movie-rail flex gap-2.5 overflow-hidden pb-3 sm:gap-3 md:gap-5 md:pb-4" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-[176px] w-[116px] shrink-0 animate-pulse rounded-[8px] bg-white/[0.045] sm:h-[220px] sm:w-[140px] md:h-[280px] md:w-[180px] xl:h-[300px] xl:w-[196px]"
        />
      ))}
    </div>
  );
}

function LazyMovieRail({
  section,
  sectionIndex,
  onSelect,
}: {
  section: MovieSection;
  sectionIndex: number;
  onSelect: (item: MovieItem) => void;
}) {
  const initiallyMounted = sectionIndex === 0;
  const { ref, mounted } = useLazyMount(initiallyMounted, '520px');
  const railRef = useRef<HTMLDivElement | null>(null);
  const loadGuardRef = useRef(false);
  const initialCount = initiallyMounted ? 16 : 10;
  const [visibleCount, setVisibleCount] = useState(initialCount);

  useEffect(() => {
    if (mounted) setVisibleCount((count) => Math.max(count, initialCount));
  }, [initialCount, mounted]);

  useEffect(() => {
    setVisibleCount(initialCount);
  }, [initialCount, section.items]);

  useEffect(() => {
    const rail = railRef.current;
    if (!mounted || !rail) return;

    function loadNextBatch() {
      if (loadGuardRef.current) return;
      if (visibleCount >= section.items.length) return;

      loadGuardRef.current = true;
      setVisibleCount((count) => Math.min(count + RAIL_LOAD_STEP, section.items.length));
      window.setTimeout(() => {
        loadGuardRef.current = false;
      }, 220);
    }

    function maybeLoadMore() {
      const currentRail = railRef.current;
      if (!currentRail) return;

      const remaining = currentRail.scrollWidth - currentRail.clientWidth - currentRail.scrollLeft;
      const threshold = Math.max(RAIL_LOAD_THRESHOLD, currentRail.clientWidth * 0.38);
      if (remaining <= threshold) loadNextBatch();
    }

    rail.addEventListener('scroll', maybeLoadMore, { passive: true });
    window.setTimeout(maybeLoadMore, 120);

    return () => rail.removeEventListener('scroll', maybeLoadMore);
  }, [mounted, section.items.length, visibleCount]);

  const visibleItems = mounted ? section.items.slice(0, visibleCount) : [];
  const hasMore = mounted && visibleCount < section.items.length;

  return (
    <div ref={ref} style={{ contentVisibility: 'auto', containIntrinsicSize: '340px 1000px' }}>
      {mounted ? (
        <div ref={railRef} className="movie-rail flex gap-2.5 overflow-x-auto pb-3 sm:gap-3 md:gap-5 md:pb-4">
          {visibleItems.map((item, index) => (
            <MovieCard
              key={`${section.slug}-${item.id}-${index}`}
              item={item}
              onSelect={onSelect}
              priority={sectionIndex === 0 && index < 6}
              priorityBadge={index % 4 === 0 ? 'ใหม่' : index % 4 === 1 ? 'พรีเมียม' : undefined}
            />
          ))}

          {hasMore ? (
            <div className="grid h-[176px] w-[92px] shrink-0 place-items-center rounded-[8px] border border-white/8 bg-white/[0.025] px-3 text-center text-[10px] font-black text-white/38 backdrop-blur-xl sm:h-[220px] md:h-[280px] md:w-[120px] md:text-xs xl:h-[300px]" aria-live="polite">
              กำลังโหลดอีก 6 เรื่อง...
            </div>
          ) : null}
        </div>
      ) : (
        <RailSkeleton />
      )}
    </div>
  );
}

export function HomeExperienceV3({ home }: { home: HomePayload }) {
  const [shuffleSeed, setShuffleSeed] = useState(1);
  const randomizedSections = useMemo(() => shuffleSections(home.sections, shuffleSeed), [home.sections, shuffleSeed]);

  const heroItems = useMemo(() => {
    const candidates = uniqueMovies([
      ...(home.heroItems?.length ? home.heroItems : [home.hero]),
      ...randomizedSections.flatMap((section) => section.items.slice(0, 12)),
    ]);

    return shuffleMovies(candidates.length ? candidates : [home.hero], shuffleSeed + 101, 'hero').slice(0, 24);
  }, [home.hero, home.heroItems, randomizedSections, shuffleSeed]);

  const allItems = useMemo(
    () => uniqueMovies([...heroItems, ...randomizedSections.flatMap((section) => section.items)]),
    [heroItems, randomizedSections],
  );

  const [heroIndex, setHeroIndex] = useState(0);
  const [selected, setSelected] = useState<MovieItem | null>(null);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [visibleFilterCount, setVisibleFilterCount] = useState(24);

  const filterLoadRef = useRef<HTMLDivElement | null>(null);

  const hero = heroItems[heroIndex] || home.hero;
  const filterMode = Boolean(query.trim()) || Boolean(activeCategory);

  const filteredItems = useMemo(
    () => allItems.filter((item) => matchQuery(item, query) && matchCategory(item, activeCategory)),
    [activeCategory, allItems, query],
  );

  const visibleFilteredItems = useMemo(
    () => filteredItems.slice(0, visibleFilterCount),
    [filteredItems, visibleFilterCount],
  );

  const recommendations = selected
    ? allItems.filter((movie) => `${movie.mediaType}-${movie.id}` !== `${selected.mediaType}-${selected.id}`).slice(0, 24)
    : allItems.slice(0, 24);

  useEffect(() => {
    setShuffleSeed(Date.now() + Math.floor(Math.random() * 1000000));
  }, []);

  useEffect(() => {
    setHeroIndex(0);
  }, [shuffleSeed]);

  useEffect(() => {
    setVisibleFilterCount(24);
  }, [activeCategory, query]);

  useEffect(() => {
    if (!filterMode || visibleFilterCount >= filteredItems.length) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const node = filterLoadRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleFilterCount((count) => Math.min(count + RAIL_LOAD_STEP, filteredItems.length));
        }
      },
      { rootMargin: '520px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [filterMode, filteredItems.length, visibleFilterCount]);

  function jumpToResults() {
    window.requestAnimationFrame(() => {
      document.getElementById('sections')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }

  function openMovie(item: MovieItem) {
    setSelected(item);
  }

  function openHeroWatch(item: MovieItem) {
    setSelected(item);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const watchTab = Array.from(document.querySelectorAll('button')).find(
          (button) => button.textContent?.trim() === 'รับชม',
        );

        watchTab?.click();
      });
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!query.trim() && !activeCategory) {
      setActiveCategory('ทั้งหมด');
    }

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
    <main className="min-h-screen overflow-x-hidden bg-[#030303] text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-black/88 backdrop-blur-2xl">
        <nav className="mx-auto flex h-[58px] max-w-[1920px] items-center px-4 md:h-[76px] md:px-7 xl:h-[88px]">
          <a
            href="/"
            className="flex items-center gap-1.5 text-[24px] font-black tracking-[-0.08em] text-[#e50914] md:text-[34px] xl:text-[38px]"
          >
            <span>DOFree</span>
            <span className="rounded bg-[#e50914] px-1 py-0.5 text-[9px] font-black tracking-normal text-white md:rounded-md md:px-1.5 md:text-[13px]">
              v3
            </span>
          </a>

          <div className="ml-auto flex items-center gap-3 md:gap-5">
            <a href="/watch-ready" className="hidden text-[15px] font-black text-[#f6c56b] md:block">
              ♛ พรีเมียม
            </a>
            <div data-dofree-menu-host="true" className="grid h-9 w-9 place-items-center md:h-12 md:w-12" />
          </div>
        </nav>
      </header>

      <section className="relative min-h-[500px] border-b border-white/[0.08] pt-[58px] md:min-h-[585px] md:pt-[76px] xl:min-h-[610px] xl:pt-[88px]">
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-y-0 right-0 w-full bg-cover bg-center opacity-90 transition duration-700 md:w-[78%]"
            style={{ backgroundImage: `url(${hero.backdropUrl})` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#030303_0%,rgba(3,3,3,0.96)_24%,rgba(3,3,3,0.78)_52%,rgba(0,0,0,0.32)_78%,#030303_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06)_0%,rgba(0,0,0,0.10)_42%,#030303_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_42%,rgba(0,0,0,0.48),transparent_18rem)]" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[442px] max-w-[1920px] flex-col justify-end px-4 pb-9 md:min-h-[509px] md:justify-center md:px-7 md:pb-0">
          <div className="max-w-[680px] md:ml-[6vw] xl:ml-[10vw]">
            <p className="mb-3 text-[13px] font-black text-[#e50914] md:mb-5 md:text-[22px]">
              {hero.status === 'published' ? 'ภาพยนตร์พร้อมรับชม' : 'ภาพยนตร์สุ่มแนะนำ'}
            </p>

            <h1 className="hero-title max-w-[92vw] text-[42px] font-black leading-[0.88] tracking-[-0.085em] text-white md:whitespace-nowrap md:text-[92px] lg:text-[112px] xl:text-[120px]">
              {shortTitle(hero)}
            </h1>

            <h2 className="mt-3 max-w-[92vw] text-[16px] font-black tracking-[-0.04em] text-white md:mt-6 md:text-[28px]">
              เมื่อความลับในอดีต... กลับมาทวงคืนทุกสิ่ง
            </h2>

            <p className="mt-2 line-clamp-3 max-w-[92vw] text-[12px] leading-5 text-white/56 md:mt-3 md:max-w-[620px] md:text-[18px] md:leading-7">
              {hero.overview}
            </p>

            <div className="mt-5 flex gap-2.5 md:mt-8 md:gap-5">
              <button
                type="button"
                onClick={() => openHeroWatch(hero)}
                className="inline-flex h-[42px] items-center gap-2 rounded-lg bg-[#e50914] px-5 text-[13px] font-black text-white shadow-glow md:h-[55px] md:px-9 md:text-[16px]"
              >
                ▶ รับชม
              </button>

              <button
                type="button"
                onClick={() => openMovie(hero)}
                className="inline-flex h-[42px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.12] px-5 text-[13px] font-black text-white/86 md:h-[55px] md:px-8 md:text-[16px]"
              >
                ⓘ รายละเอียด
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-[58px] z-40 mx-auto -mt-5 max-w-[1920px] px-4 pb-2 md:top-[76px] md:-mt-7 md:px-7 xl:top-[88px]">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full bg-[linear-gradient(180deg,rgba(3,3,3,0.92),rgba(3,3,3,0.72)_68%,rgba(3,3,3,0))] backdrop-blur-sm" />
        <div className="mx-auto max-w-[760px] rounded-[20px] bg-black/42 p-1.5 shadow-[0_22px_85px_rgba(0,0,0,0.72)] backdrop-blur-2xl md:max-w-[980px] md:rounded-[26px] md:p-2.5">
          <div className="rounded-[17px] bg-white/[0.065] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-xl md:rounded-[22px] md:p-2.5">
            <form
              onSubmit={onSubmit}
              className="flex h-8 items-center gap-1.5 rounded-[12px] bg-white/[0.105] px-2.5 text-white shadow-[0_10px_34px_rgba(0,0,0,0.35)] md:h-11 md:rounded-[16px] md:px-3.5"
            >
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหา"
                className="min-w-0 flex-1 bg-transparent text-[11px] font-bold text-white outline-none placeholder:text-white/50 md:text-[14px]"
              />

              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="grid h-5 w-5 place-items-center rounded-full bg-black/28 text-[10px] text-white/80"
                >
                  ×
                </button>
              ) : null}

              <button
                type="submit"
                className="rounded-full bg-white/[0.12] px-2 py-1 text-[9px] font-black text-white/72 md:px-3 md:text-[11px]"
              >
                ค้นหา
              </button>
            </form>

            <div className="mt-2 flex max-h-[138px] flex-wrap gap-1.5 overflow-y-auto pr-1 md:mt-2.5 md:max-h-[96px] md:gap-2 md:overflow-y-auto md:pr-1 xl:max-h-[112px]">
              {categoryChips.map((chip) => {
                const active = activeCategory === chip;

                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => chooseCategory(chip)}
                    className={`inline-flex h-[22px] items-center rounded-full px-2.5 text-[9px] font-black leading-none transition md:h-7 md:px-3 md:text-[11px] ${
                      active
                        ? 'bg-[#e50914] text-white shadow-glow'
                        : 'bg-white/[0.075] text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-white/[0.13] hover:text-white'
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section
        id="sections"
        className="mx-auto max-w-[1920px] scroll-mt-[220px] bg-black px-4 py-6 md:scroll-mt-[240px] md:px-7 md:py-8 xl:scroll-mt-[260px]"
      >
        {filterMode ? (
          <div style={{ contentVisibility: 'auto', containIntrinsicSize: '780px 1000px' }}>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]/80">ผลลัพธ์</p>
                <h2 className="mt-1 text-[21px] font-black tracking-[-0.05em] md:text-[34px]">
                  {query.trim() ? `ค้นหา “${query.trim()}”` : activeCategory}
                </h2>
                <p className="mt-1 text-[11px] font-semibold text-white/44">
                  พบ {filteredItems.length} เรื่อง • แสดง {visibleFilteredItems.length} เรื่อง
                </p>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-white/12 bg-white/[0.08] px-3 py-2 text-[11px] font-black text-white/72 backdrop-blur-xl"
              >
                ล้างค่า
              </button>
            </div>

            {visibleFilteredItems.length ? (
              <>
                <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-6 md:gap-4 lg:grid-cols-7 xl:grid-cols-8">
                  {visibleFilteredItems.map((item, index) => (
                    <MovieCard
                      key={`filter-${item.mediaType}-${item.id}-${index}`}
                      item={item}
                      onSelect={openMovie}
                      grid
                      priority={index < 8}
                      priorityBadge={activeCategory && activeCategory !== 'ทั้งหมด' ? activeCategory : undefined}
                    />
                  ))}
                </div>

                {visibleFilteredItems.length < filteredItems.length ? (
                  <div ref={filterLoadRef} className="py-6 text-center text-[11px] font-black text-white/38">
                    กำลังโหลดเพิ่มอีก 6 เรื่อง...
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 text-center text-sm font-bold text-white/58">
                ไม่พบหนังที่ตรงกับเงื่อนไขนี้
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8 md:space-y-12">
            {randomizedSections.map((section, sectionIndex) => (
              <div
                key={section.slug}
                className="relative"
                style={{
                  contentVisibility: sectionIndex > 1 ? 'auto' : 'visible',
                  containIntrinsicSize: '360px 1000px',
                }}
              >
                <div className="mb-3 flex items-center justify-between md:mb-6">
                  <div>
                    {sectionIndex > 0 ? (
                      <p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#e50914]/80">
                        {section.eyebrow}
                      </p>
                    ) : null}
                    <h2 className="text-[20px] font-black tracking-[-0.04em] md:text-[30px]">
                      {sectionIndex === 0 ? 'แนะนำสำหรับคุณ' : section.title}
                    </h2>
                  </div>

                  <a href="/watch-ready" className="text-[12px] font-black text-white/50 hover:text-white md:text-[16px]">
                    ดูทั้งหมด ›
                  </a>
                </div>

                <LazyMovieRail section={section} sectionIndex={sectionIndex} onSelect={openMovie} />
              </div>
            ))}
          </div>
        )}
      </section>

      {filterMode ? (
        <button
          type="button"
          onClick={clearFilters}
          className="fixed right-3 top-1/2 z-[60] -translate-y-1/2 rounded-full border border-white/18 bg-black/45 px-3 py-2 text-[11px] font-black text-white/86 shadow-[0_0_28px_rgba(229,9,20,0.44)] backdrop-blur-xl animate-pulse md:right-6 md:px-4 md:py-3 md:text-xs"
        >
          ล้างค่า
        </button>
      ) : null}

      {selected ? (
        <DetailWindow
          item={selected}
          recommendations={recommendations}
          onClose={() => setSelected(null)}
          onSelect={openMovie}
        />
      ) : null}
    </main>
  );
}
