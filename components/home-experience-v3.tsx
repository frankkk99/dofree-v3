'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { HomePayload, MovieItem, MovieSection } from '@/lib/tmdb';
import { MovieCard } from '@/components/movie-card';
import { DetailWindow } from '@/components/window-system';
import { canUseNextImage } from '@/lib/image-optimizer';

const RAIL_LOAD_STEP = 6;
const RAIL_LOAD_THRESHOLD = 360;
const thaiMonthShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

type SectionItemsResponse = {
  ok?: boolean;
  items?: MovieItem[];
  hasMore?: boolean;
};

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
    .map((item, index) => ({ item, score: seededMovieScore(item, seed || 1, scope, index) }))
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

function heroEnglishReleaseLine(item: MovieItem) {
  const englishTitle = item.titleEn || item.title;
  const releaseDate = (item as MovieItem & { releaseDate?: string }).releaseDate || '';
  if (!releaseDate) return englishTitle;

  const date = new Date(`${releaseDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return englishTitle;

  const month = thaiMonthShort[date.getUTCMonth()] || '';
  const year = date.getUTCFullYear();
  return `${englishTitle} · เข้าฉาย ${month} ${year}`;
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
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setMounted(true);
        observer.disconnect();
      }
    }, { rootMargin });
    observer.observe(node);
    return () => observer.disconnect();
  }, [mounted, rootMargin]);

  return { ref, mounted };
}

function RailSkeleton() {
  return (
    <div className="movie-rail flex gap-2.5 overflow-hidden pb-3 sm:gap-3 md:gap-5 md:pb-4" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-[176px] w-[116px] shrink-0 animate-pulse rounded-[8px] bg-white/[0.045] sm:h-[220px] sm:w-[140px] md:h-[280px] md:w-[180px] xl:h-[300px] xl:w-[196px]" />
      ))}
    </div>
  );
}

function railSegmentWidth(rail: HTMLElement) {
  return rail.scrollWidth / 3;
}

function LazyMovieRail({ section, sectionIndex, onSelect }: { section: MovieSection; sectionIndex: number; onSelect: (item: MovieItem) => void }) {
  const initiallyMounted = sectionIndex === 0;
  const { ref, mounted } = useLazyMount(initiallyMounted, '520px');
  const railRef = useRef<HTMLDivElement | null>(null);
  const loadGuardRef = useRef(false);
  const jumpGuardRef = useRef(false);
  const loopReadyRef = useRef(false);
  const [items, setItems] = useState(section.items.slice(0, RAIL_LOAD_STEP));
  const [hasMore, setHasMore] = useState(section.items.length >= RAIL_LOAD_STEP);
  const [loadingMore, setLoadingMore] = useState(false);
  const canLoop = items.length > 1;
  const renderedItems = canLoop ? [...items, ...items, ...items] : items;

  useEffect(() => {
    setItems(section.items.slice(0, RAIL_LOAD_STEP));
    setHasMore(section.items.length >= RAIL_LOAD_STEP);
    setLoadingMore(false);
    loadGuardRef.current = false;
    loopReadyRef.current = false;
  }, [section.items]);

  const loadNextBatch = useCallback(async () => {
    if (!mounted || loadingMore || loadGuardRef.current || !hasMore) return;

    loadGuardRef.current = true;
    setLoadingMore(true);

    try {
      const response = await fetch(`/api/catalog/section?slug=${encodeURIComponent(section.slug)}&limit=${RAIL_LOAD_STEP}&offset=${items.length}`);
      const data = await response.json() as SectionItemsResponse;
      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems((current) => uniqueMovies([...current, ...nextItems]));
      setHasMore(Boolean(data.hasMore) && nextItems.length > 0);
    } catch {
      setHasMore(false);
    } finally {
      window.setTimeout(() => {
        loadGuardRef.current = false;
        setLoadingMore(false);
      }, 220);
    }
  }, [hasMore, items.length, loadingMore, mounted, section.slug]);

  const handleLoopBounds = useCallback(() => {
    const rail = railRef.current;
    if (!rail || !canLoop || jumpGuardRef.current) return;
    const segment = railSegmentWidth(rail);
    if (!segment) return;

    if (rail.scrollLeft < segment * 0.2) {
      jumpGuardRef.current = true;
      rail.scrollLeft += segment;
      window.requestAnimationFrame(() => { jumpGuardRef.current = false; });
    } else if (rail.scrollLeft > segment * 1.8) {
      jumpGuardRef.current = true;
      rail.scrollLeft -= segment;
      window.requestAnimationFrame(() => { jumpGuardRef.current = false; });
    }
  }, [canLoop]);

  const maybeLoadMore = useCallback(() => {
    const rail = railRef.current;
    if (!rail || !hasMore || loadingMore || loadGuardRef.current) return;

    if (canLoop) {
      const segment = railSegmentWidth(rail);
      if (segment && rail.scrollLeft >= segment * 1.45) loadNextBatch();
      return;
    }

    const remaining = rail.scrollWidth - rail.clientWidth - rail.scrollLeft;
    const threshold = Math.max(RAIL_LOAD_THRESHOLD, rail.clientWidth * 0.38);
    if (remaining <= threshold) loadNextBatch();
  }, [canLoop, hasMore, loadNextBatch, loadingMore]);

  useEffect(() => {
    const rail = railRef.current;
    if (!mounted || !rail) return;

    function onScroll() {
      if (jumpGuardRef.current) return;
      maybeLoadMore();
      handleLoopBounds();
    }

    rail.addEventListener('scroll', onScroll, { passive: true });
    window.setTimeout(() => {
      maybeLoadMore();
      handleLoopBounds();
    }, 120);

    return () => rail.removeEventListener('scroll', onScroll);
  }, [handleLoopBounds, maybeLoadMore, mounted]);

  useEffect(() => {
    const rail = railRef.current;
    if (!mounted || !canLoop || !rail || loopReadyRef.current) return;
    const id = window.requestAnimationFrame(() => {
      const currentRail = railRef.current;
      if (!currentRail) return;
      currentRail.scrollLeft = railSegmentWidth(currentRail);
      loopReadyRef.current = true;
    });
    return () => window.cancelAnimationFrame(id);
  }, [canLoop, mounted, section.slug]);

  return (
    <div ref={ref} style={{ contentVisibility: 'auto', containIntrinsicSize: '340px 1000px' }}>
      {mounted ? (
        <div ref={railRef} className="movie-rail flex max-w-full gap-2.5 overflow-x-auto overflow-y-hidden scroll-smooth pb-3 sm:gap-3 md:gap-5 md:pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          {renderedItems.map((item, index) => (
            <MovieCard key={`${section.slug}-${item.mediaType}-${item.id}-${index}`} item={item} onSelect={onSelect} priority={sectionIndex === 0 && index < 3} priorityBadge={section.slug === 'coming-soon' ? 'เร็ว ๆ นี้' : index % 4 === 0 ? 'ใหม่' : undefined} />
          ))}
          {loadingMore ? Array.from({ length: RAIL_LOAD_STEP }).map((_, index) => (
            <div key={`loading-${section.slug}-${index}`} className="h-[176px] w-[116px] shrink-0 animate-pulse rounded-[8px] bg-white/[0.045] sm:h-[220px] sm:w-[140px] md:h-[280px] md:w-[180px] xl:h-[300px] xl:w-[196px]" aria-hidden="true" />
          )) : null}
        </div>
      ) : <RailSkeleton />}
    </div>
  );
}

export function HomeExperienceV3({ home }: { home: HomePayload }) {
  const [shuffleSeed, setShuffleSeed] = useState(1);
  const randomizedSections = useMemo(() => shuffleSections(home.sections, shuffleSeed), [home.sections, shuffleSeed]);
  const heroItems = useMemo(() => {
    const candidates = uniqueMovies([...(home.heroItems?.length ? home.heroItems : [home.hero]), ...randomizedSections.flatMap((section) => section.items.slice(0, 6))]);
    return shuffleMovies(candidates.length ? candidates : [home.hero], shuffleSeed + 101, 'hero').slice(0, 24);
  }, [home.hero, home.heroItems, randomizedSections, shuffleSeed]);
  const allItems = useMemo(() => uniqueMovies([...heroItems, ...randomizedSections.flatMap((section) => section.items)]), [heroItems, randomizedSections]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [selected, setSelected] = useState<MovieItem | null>(null);
  const hero = heroItems[heroIndex] || home.hero;
  const heroImage = hero.backdropUrl || hero.posterUrl;
  const optimizeHeroImage = canUseNextImage(heroImage);
  const recommendations = selected ? allItems.filter((movie) => `${movie.mediaType}-${movie.id}` !== `${selected.mediaType}-${selected.id}`).slice(0, 24) : allItems.slice(0, 24);

  useEffect(() => {
    setShuffleSeed(Date.now() + Math.floor(Math.random() * 1000000));
  }, []);

  useEffect(() => {
    setHeroIndex(0);
  }, [shuffleSeed]);

  function openMovie(item: MovieItem) {
    setSelected(item);
  }

  function openHeroWatch(item: MovieItem) {
    setSelected(item);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const watchTab = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'รับชม');
        watchTab?.click();
      });
    });
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030303] text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-black/88 backdrop-blur-2xl">
        <nav className="mx-auto flex h-[58px] max-w-[1920px] items-center px-4 md:h-[76px] md:px-7 xl:h-[88px]">
          <a href="/" className="flex items-center gap-1.5 text-[24px] font-black tracking-[-0.08em] text-[#e50914] md:text-[34px] xl:text-[38px]"><span>DOFree</span><span className="rounded bg-[#e50914] px-1 py-0.5 text-[9px] font-black tracking-normal text-white md:rounded-md md:px-1.5 md:text-[13px]">v3</span></a>
          <div className="ml-auto flex items-center gap-3 md:gap-5"><div data-dofree-menu-host="true" className="grid h-9 w-9 place-items-center md:h-12 md:w-12" /></div>
        </nav>
      </header>

      <section className="relative min-h-[500px] border-b border-white/[0.08] pt-[58px] md:min-h-[585px] md:pt-[76px] xl:min-h-[610px] xl:pt-[88px]">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-y-0 right-0 h-full w-full md:w-[78%]">
            {heroImage && optimizeHeroImage ? <Image src={heroImage} alt="" fill priority sizes="(max-width: 768px) 100vw, 78vw" className="object-cover object-center opacity-90 transition duration-700" /> : heroImage ? <img src={heroImage} alt="" loading="eager" decoding="async" fetchPriority="high" className="h-full w-full object-cover object-center opacity-90 transition duration-700" /> : null}
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#030303_0%,rgba(3,3,3,0.96)_24%,rgba(3,3,3,0.78)_52%,rgba(0,0,0,0.32)_78%,#030303_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06)_0%,rgba(0,0,0,0.10)_42%,#030303_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_42%,rgba(0,0,0,0.48),transparent_18rem)]" />
        </div>
        <div className="relative z-10 mx-auto flex min-h-[442px] max-w-[1920px] flex-col justify-end px-4 pb-9 md:min-h-[509px] md:justify-center md:px-7 md:pb-0">
          <div className="max-w-[680px] md:ml-[6vw] xl:ml-[10vw]">
            <p className="mb-3 text-[13px] font-black text-[#e50914] md:mb-5 md:text-[22px]">{hero.label === 'เร็ว ๆ นี้' ? 'ภาพยนตร์กำลังจะเข้าฉาย' : hero.status === 'published' ? 'ภาพยนตร์พร้อมรับชม' : 'ภาพยนตร์เริ่มฉายล่าสุด'}</p>
            <h1 className="hero-title max-w-[92vw] text-[42px] font-black leading-[0.88] tracking-[-0.085em] text-white md:whitespace-nowrap md:text-[92px] lg:text-[112px] xl:text-[120px]">{shortTitle(hero)}</h1>
            <h2 className="mt-3 max-w-[92vw] text-[16px] font-black tracking-[-0.04em] text-white md:mt-6 md:text-[28px]">{heroEnglishReleaseLine(hero)}</h2>
            <p className="mt-2 line-clamp-3 max-w-[92vw] text-[12px] leading-5 text-white/56 md:mt-3 md:max-w-[620px] md:text-[18px] md:leading-7">{hero.overview}</p>
            <div className="mt-5 flex gap-2.5 md:mt-8 md:gap-5"><button type="button" onClick={() => openHeroWatch(hero)} className="inline-flex h-[42px] items-center gap-2 rounded-lg bg-[#e50914] px-5 text-[13px] font-black text-white shadow-glow md:h-[55px] md:px-9 md:text-[16px]">▶ รับชม</button><button type="button" onClick={() => openMovie(hero)} className="inline-flex h-[42px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.12] px-5 text-[13px] font-black text-white/86 md:h-[55px] md:px-8 md:text-[16px]">ⓘ รายละเอียด</button></div>
          </div>
        </div>
      </section>

      <section id="sections" className="mx-auto max-w-[1920px] scroll-mt-[120px] bg-black px-4 py-7 md:px-7 md:py-10">
        <div className="space-y-8 md:space-y-12">
          {randomizedSections.map((section, sectionIndex) => (
            <div key={section.slug} className="relative" style={{ contentVisibility: sectionIndex > 1 ? 'auto' : 'visible', containIntrinsicSize: '360px 1000px' }}>
              <div className="mb-3 flex items-center justify-between md:mb-6"><div>{section.eyebrow ? <p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#e50914]/80">{section.eyebrow}</p> : null}<h2 className="text-[20px] font-black tracking-[-0.04em] md:text-[30px]">{section.title}</h2></div><a href={`#${section.slug}`} className="text-[12px] font-black text-white/50 hover:text-white md:text-[16px]">ดูทั้งหมด ›</a></div>
              <LazyMovieRail section={section} sectionIndex={sectionIndex} onSelect={openMovie} />
            </div>
          ))}
        </div>
      </section>

      {selected ? <DetailWindow item={selected} recommendations={recommendations} onClose={() => setSelected(null)} onSelect={openMovie} /> : null}
    </main>
  );
}
