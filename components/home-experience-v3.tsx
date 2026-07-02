'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { HomePayload, MovieItem, MovieSection } from '@/lib/tmdb';
import { AdSlot } from '@/components/ad-slot';
import { HomeHeroMedia } from '@/components/home-hero-media';
import { MovieCard } from '@/components/movie-card';
import { mediaDetailPath } from '@/lib/seo';

const RAIL_LOAD_STEP = 9;
const RAIL_LOAD_THRESHOLD = 360;
const RAIL_OBSERVER_MARGIN = '160px';
const HERO_CANDIDATE_LIMIT = 32;
const thaiMonthShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const homeSmartExamples = ['หนังผีเกาหลีคะแนนดี', 'หนังไทยตลก', 'ซีรีส์จีนย้อนยุค', 'หนังคล้าย John Wick', 'หนังดูคืนนี้ไม่เครียด'];

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

function numericYear(item: MovieItem) {
  const year = Number(item.year || 0);
  return Number.isFinite(year) ? year : 0;
}

function isRecentEnoughForHero(item: MovieItem) {
  const year = numericYear(item);
  const currentYear = new Date().getFullYear();
  return year >= currentYear - 2 || item.label === 'เร็ว ๆ นี้';
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
  const comingSoon = sections.find((section) => section.slug === 'coming-soon');
  const orderedSections = comingSoon ? [comingSoon, ...sections.filter((section) => section.slug !== 'coming-soon')] : sections;
  return orderedSections.map((section, index) => ({
    ...section,
    items: shuffleMovies(section.items, seed + index + 11, section.slug),
  }));
}

function dailySeed() {
  const day = new Date().toISOString().slice(0, 10);
  return day.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function freshShuffleSeed() {
  const random = Math.floor(Math.random() * 1_000_000);
  return (Date.now() % 1_000_000) + random;
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

function releaseWindowBadge(item: MovieItem) {
  const releaseDate = (item as MovieItem & { releaseDate?: string }).releaseDate || '';
  if (!releaseDate) return 'เร็ว ๆ นี้';
  const today = new Date().toISOString().slice(0, 10);
  return releaseDate > today ? 'เร็ว ๆ นี้' : 'เข้าใหม่';
}

function sectionHref(section: MovieSection) {
  if (section.slug === 'watch-ready') return '/watch-ready';
  return `/category/${encodeURIComponent(section.slug)}`;
}

function useLazyMount(rootMargin = RAIL_OBSERVER_MARGIN) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

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
      {Array.from({ length: RAIL_LOAD_STEP }).map((_, index) => (
        <div key={index} className="h-[176px] w-[116px] shrink-0 animate-pulse rounded-[8px] bg-white/[0.045] sm:h-[220px] sm:w-[140px] md:h-[280px] md:w-[180px] xl:h-[300px] xl:w-[196px]" />
      ))}
    </div>
  );
}

function LazyMovieRail({ section, sectionIndex }: { section: MovieSection; sectionIndex: number }) {
  const { ref, mounted } = useLazyMount();
  const railRef = useRef<HTMLDivElement | null>(null);
  const loadGuardRef = useRef(false);
  const [items, setItems] = useState(section.items.slice(0, RAIL_LOAD_STEP));
  const [hasMore, setHasMore] = useState(section.items.length >= RAIL_LOAD_STEP);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setItems(section.items.slice(0, RAIL_LOAD_STEP));
    setHasMore(section.items.length >= RAIL_LOAD_STEP);
    setLoadingMore(false);
    loadGuardRef.current = false;
  }, [section.items]);

  const loadNextBatch = useCallback(async (requestedLimit = RAIL_LOAD_STEP) => {
    if (!mounted || loadingMore || loadGuardRef.current || !hasMore) return;

    loadGuardRef.current = true;
    setLoadingMore(true);

    try {
      const limit = Math.max(1, Math.min(requestedLimit, RAIL_LOAD_STEP));
      const response = await fetch(`/api/catalog/section?slug=${encodeURIComponent(section.slug)}&limit=${limit}&offset=${items.length}`);
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

  const maybeLoadMore = useCallback(() => {
    const rail = railRef.current;
    if (!rail || !hasMore || loadingMore || loadGuardRef.current) return;

    const remaining = rail.scrollWidth - rail.clientWidth - rail.scrollLeft;
    const threshold = Math.max(RAIL_LOAD_THRESHOLD, rail.clientWidth * 0.38);
    if (remaining <= threshold) void loadNextBatch();
  }, [hasMore, loadNextBatch, loadingMore]);

  useEffect(() => {
    if (!mounted || items.length >= RAIL_LOAD_STEP || !hasMore) return;
    void loadNextBatch(RAIL_LOAD_STEP - items.length);
  }, [hasMore, items.length, loadNextBatch, mounted]);

  useEffect(() => {
    const rail = railRef.current;
    if (!mounted || !rail) return;

    function onScroll() {
      maybeLoadMore();
    }

    rail.addEventListener('scroll', onScroll, { passive: true });
    return () => rail.removeEventListener('scroll', onScroll);
  }, [maybeLoadMore, mounted]);

  return (
    <div ref={ref} style={{ contentVisibility: 'auto', containIntrinsicSize: '340px 1000px' }}>
      {mounted ? (
        <div ref={railRef} className="movie-rail flex max-w-full gap-2.5 overflow-x-auto overflow-y-hidden scroll-smooth pb-3 sm:gap-3 md:gap-5 md:pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          {items.map((item, index) => (
            <Fragment key={`${section.slug}-${item.mediaType}-${item.id}-${index}`}>
              <MovieCard item={item} priority={sectionIndex === 0 && index < 3} priorityBadge={section.slug === 'coming-soon' ? releaseWindowBadge(item) : index % 4 === 0 ? 'ใหม่' : undefined} />
              {sectionIndex === 0 && index === 3 ? <AdSlot code="AD-MB-H03" variant="native" className="w-[116px] shrink-0 sm:w-[140px]" /> : null}
              {sectionIndex === 0 && index === 5 ? <AdSlot code="AD-PC-H02" variant="native" className="w-[180px] shrink-0 xl:w-[196px]" /> : null}
            </Fragment>
          ))}
          {loadingMore ? Array.from({ length: Math.min(RAIL_LOAD_STEP, Math.max(1, RAIL_LOAD_STEP - items.length)) }).map((_, index) => (
            <div key={`loading-${section.slug}-${index}`} className="h-[176px] w-[116px] shrink-0 animate-pulse rounded-[8px] bg-white/[0.045] sm:h-[220px] sm:w-[140px] md:h-[280px] md:w-[180px] xl:h-[300px] xl:w-[196px]" aria-hidden="true" />
          )) : null}
        </div>
      ) : <RailSkeleton />}
    </div>
  );
}

function HomeSmartSearchBlock() {
  return (
    <section className="mt-6 rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(229,9,20,0.16),transparent_18rem),rgba(255,255,255,0.04)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:mt-8 md:rounded-[30px] md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]/80">Smart Search</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] md:text-4xl">ค้นหาหนังแบบไม่ต้องจำชื่อเรื่อง</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/52 md:text-base md:leading-7">พิมพ์ชื่อหนัง แนวหนัง ประเทศ ภาษา หรือความรู้สึกที่อยากดู ระบบจะช่วยคัดรายการที่ใกล้เคียงให้</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a href="/search" className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#e50914] px-10 text-xs font-black text-white shadow-glow sm:w-[220px] md:w-[260px]">เริ่มค้นหา</a>
          <a href="/how-to-use" className="inline-flex h-12 items-center justify-center rounded-full bg-white/[0.09] px-5 text-xs font-black text-white/72 hover:bg-white/[0.14] hover:text-white">วิธีใช้งาน</a>
        </div>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
        {homeSmartExamples.map((example) => (
          <a key={example} href={`/search?q=${encodeURIComponent(example)}`} className="shrink-0 rounded-full bg-white/[0.08] px-3 py-2 text-[10px] font-black text-white/70 hover:bg-[#e50914] hover:text-white md:text-xs">{example}</a>
        ))}
      </div>
      <p className="mt-3 text-[10px] font-semibold leading-4 text-white/34">ตัวช่วยค้นหาอัจฉริยะกำลังอยู่ระหว่างพัฒนา ทดลองใช้ได้แล้ว และจะค่อย ๆ แม่นขึ้นตามฐานข้อมูลที่เพิ่มเข้ามา</p>
    </section>
  );
}

export function HomeExperienceV3({ home }: { home: HomePayload }) {
  const [shuffleSeed] = useState(() => dailySeed());
  const [liveSeed, setLiveSeed] = useState(shuffleSeed);
  const liveRandomizedSections = useMemo(() => shuffleSections(home.sections, liveSeed), [home.sections, liveSeed]);
  const heroItems = useMemo(() => {
    const comingSoonItems = liveRandomizedSections.find((section) => section.slug === 'coming-soon')?.items || [];
    const comingSoonCandidates = uniqueMovies(comingSoonItems).filter((item) => (item.backdropUrl || item.posterUrl) && isRecentEnoughForHero(item));
    if (comingSoonCandidates.length) return comingSoonCandidates.slice(0, HERO_CANDIDATE_LIMIT);

    const sectionHeroItems = liveRandomizedSections.flatMap((section) => section.items || []);
    const candidates = uniqueMovies([
      ...(home.heroItems || []),
      ...sectionHeroItems,
      home.hero,
    ]).filter((item) => isRecentEnoughForHero(item));
    const shuffledCandidates = shuffleMovies(candidates, liveSeed + 97, 'homepage-hero');
    return shuffledCandidates.length ? shuffledCandidates.slice(0, HERO_CANDIDATE_LIMIT) : [home.hero];
  }, [home.hero, home.heroItems, liveRandomizedSections, liveSeed]);
  const [heroIndex, setHeroIndex] = useState(0);
  const hero = heroItems[heroIndex] || home.hero;
  const heroImage = hero.backdropUrl || hero.posterUrl;

  useEffect(() => {
    setHeroIndex(0);
  }, [liveSeed]);

  useEffect(() => {
    setLiveSeed(freshShuffleSeed());
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030303] text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-black/88 backdrop-blur-2xl">
        <nav className="mx-auto flex h-[58px] max-w-[1920px] items-center px-4 md:h-[76px] md:px-7 xl:h-[88px]">
          <a href="/" className="flex items-center gap-1.5 text-[22px] font-black tracking-[-0.06em] text-[#e50914] md:text-[31px] xl:text-[34px]"><span>ดูดีดี.online</span></a>
          <div className="ml-auto flex items-center gap-3 md:gap-5"><div data-dofree-menu-host="true" className="grid h-9 w-9 place-items-center md:h-12 md:w-12" /></div>
        </nav>
      </header>

      <section className="relative min-h-[500px] border-b border-white/[0.08] pt-[58px] md:min-h-[585px] md:pt-[76px] xl:min-h-[610px] xl:pt-[88px]">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-y-0 right-0 h-full w-full md:w-[78%]">
            <HomeHeroMedia imageUrl={heroImage} title={hero.title} />
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
            <div className="mt-5 flex flex-wrap gap-2.5 md:mt-8 md:gap-4">
              <a href="/watch-ready" className="inline-flex h-[42px] items-center gap-2 rounded-lg bg-[#e50914] px-5 text-[13px] font-black text-white shadow-glow md:h-[55px] md:px-8 md:text-[16px]">▶ เริ่มดูหนังพร้อมดู</a>
              <a href={`${mediaDetailPath(hero.mediaType, hero.id, hero.title)}#trailer`} className="inline-flex h-[42px] items-center gap-2 rounded-lg bg-white/[0.12] px-5 text-[13px] font-black text-white/90 md:h-[55px] md:px-7 md:text-[16px]">ชมตัวอย่าง</a>
              <a href={mediaDetailPath(hero.mediaType, hero.id, hero.title)} className="inline-flex h-[42px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.08] px-5 text-[13px] font-black text-white/78 md:h-[55px] md:px-7 md:text-[16px]">ⓘ รายละเอียด</a>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1920px] bg-black px-4 pt-5 md:px-7">
        <AdSlot code="AD-PC-H01" className="mx-auto max-w-5xl" />
        <AdSlot code="AD-MB-H01" className="mx-auto max-w-sm" />
      </div>

      <section id="sections" className="mx-auto max-w-[1920px] scroll-mt-[120px] bg-black px-4 py-7 md:px-7 md:py-10">
        <div className="space-y-8 md:space-y-12">
          {liveRandomizedSections.map((section, sectionIndex) => (
            <div id={section.slug} key={section.slug} className="relative scroll-mt-[96px]" style={{ contentVisibility: sectionIndex > 1 ? 'auto' : 'visible', containIntrinsicSize: '360px 1000px' }}>
              <div className="mb-3 flex items-center justify-between md:mb-6"><div>{section.eyebrow ? <p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#e50914]/80">{section.eyebrow}</p> : null}<h2 className="text-[20px] font-black tracking-[-0.04em] md:text-[30px]">{section.title}</h2></div><a href={sectionHref(section)} className="text-[12px] font-black text-white/50 hover:text-white md:text-[16px]">ทั้งหมด ›</a></div>
              {sectionIndex === 2 ? (
                <div className="mb-6">
                  <AdSlot code="AD-PC-H04" className="mx-auto max-w-5xl" />
                  <AdSlot code="AD-MB-H04" className="mx-auto max-w-sm" />
                </div>
              ) : null}
              <LazyMovieRail section={section} sectionIndex={sectionIndex} />
              {sectionIndex === 0 ? <HomeSmartSearchBlock /> : null}
            </div>
          ))}
        </div>
      </section>

    </main>
  );
}
