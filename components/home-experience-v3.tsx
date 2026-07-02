'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { HomePayload, MovieItem, MovieSection } from '@/lib/tmdb';
import { AdSlot } from '@/components/ad-slot';
import { ClipsComingSoonSection } from '@/components/clips-coming-soon-section';
import { HomeHeroMedia } from '@/components/home-hero-media';
import { MovieCard } from '@/components/movie-card';
import { mediaDetailPath } from '@/lib/seo';

const RAIL_LOAD_STEP = 9;
const RAIL_LOAD_THRESHOLD = 360;
const RAIL_OBSERVER_MARGIN = '160px';
const HERO_CANDIDATE_LIMIT = 32;
const thaiMonthShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const smartSearchExamples = ['Marvel', 'DC', 'HBO', 'Netflix', 'หนังผีเกาหลี', 'พากย์ไทย', 'ซีรีส์จีน', 'แอ็กชัน', 'โรแมนติก', 'ซอมบี้', 'สืบสวน', 'ดูสบาย'];

type SectionItemsResponse = {
  ok?: boolean;
  items?: MovieItem[];
  hasMore?: boolean;
};

function SearchIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.15">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

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
  const autoCarousel = Boolean(section.autoplay);

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

  useEffect(() => {
    const rail = railRef.current;
    if (!mounted || !autoCarousel || !rail || typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let lastTime = 0;
    let paused = false;
    const speed = 0.018;

    const pause = () => { paused = true; };
    const resume = () => { paused = false; };
    const tick = (time: number) => {
      if (!lastTime) lastTime = time;
      const delta = time - lastTime;
      lastTime = time;

      if (!paused && rail.scrollWidth > rail.clientWidth) {
        rail.scrollLeft += delta * speed;
        if (rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2) rail.scrollLeft = 0;
        maybeLoadMore();
      }
      frame = window.requestAnimationFrame(tick);
    };

    rail.addEventListener('mouseenter', pause);
    rail.addEventListener('mouseleave', resume);
    rail.addEventListener('pointerdown', pause);
    rail.addEventListener('pointerup', resume);
    rail.addEventListener('pointercancel', resume);
    rail.addEventListener('touchstart', pause, { passive: true });
    rail.addEventListener('touchend', resume, { passive: true });
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      rail.removeEventListener('mouseenter', pause);
      rail.removeEventListener('mouseleave', resume);
      rail.removeEventListener('pointerdown', pause);
      rail.removeEventListener('pointerup', resume);
      rail.removeEventListener('pointercancel', resume);
      rail.removeEventListener('touchstart', pause);
      rail.removeEventListener('touchend', resume);
    };
  }, [autoCarousel, maybeLoadMore, mounted]);

  return (
    <div ref={ref} style={{ contentVisibility: 'auto', containIntrinsicSize: '340px 1000px' }}>
      {mounted ? (
        <div ref={railRef} className="movie-rail flex max-w-full gap-2.5 overflow-x-auto overflow-y-hidden scroll-smooth pb-3 sm:gap-3 md:gap-5 md:pb-4" data-auto-carousel={autoCarousel ? 'true' : undefined} style={{ WebkitOverflowScrolling: 'touch' }}>
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

function searchUrl(query: string) {
  const text = query.trim();
  return text ? `/search?q=${encodeURIComponent(text)}` : '/search';
}

function SmartSearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 80);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  function goSearch(value = query) {
    window.location.href = searchUrl(value);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    goSearch();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end bg-black/72 p-3 text-white backdrop-blur-xl md:items-center md:justify-center md:p-6" onMouseDown={onClose}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_10%,rgba(229,9,20,0.22),transparent_24rem),radial-gradient(circle_at_12%_92%,rgba(255,255,255,0.08),transparent_18rem)]" />
      <section className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0b0b]/94 p-4 shadow-[0_40px_160px_rgba(0,0,0,0.82),inset_0_1px_0_rgba(255,255,255,0.10)] md:rounded-[34px] md:p-6" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.30em] text-[#e50914]">Smart Search</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.07em] md:text-5xl">พิมพ์ผิดก็หาเจอ</h2>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/56 md:text-base md:leading-7">ค้นหาจากชื่อเรื่อง แนวหนัง ค่าย ประเทศ ภาษา หรืออารมณ์ที่อยากดู</p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด Smart Search" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.08] text-xl font-black text-white/76 ring-1 ring-white/10 transition hover:bg-[#e50914] hover:text-white md:h-12 md:w-12">×</button>
        </div>

        <form onSubmit={submitSearch} className="mt-5 rounded-[24px] bg-white/[0.055] p-2 ring-1 ring-white/10 md:mt-6 md:flex md:items-center md:gap-2">
          <label className="flex h-12 items-center gap-3 rounded-[18px] bg-black/36 px-4 ring-1 ring-white/8 md:h-14 md:flex-1">
            <SearchIcon className="h-5 w-5 shrink-0 text-white/46" />
            <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ลองพิมพ์: หนังผีเกาหลี, Marvel, พากย์ไทย" className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/34 md:text-base" />
          </label>
          <button type="submit" className="mt-2 h-12 w-full rounded-[18px] bg-[#e50914] text-sm font-black text-white shadow-[0_16px_44px_rgba(229,9,20,0.30)] md:mt-0 md:h-14 md:w-32">ค้นหา</button>
        </form>

        <div className="mt-5">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/34">ลองค้นหาเร็ว</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {smartSearchExamples.map((example) => (
              <button key={example} type="button" onClick={() => goSearch(example)} className="rounded-full bg-white/[0.08] px-3 py-2 text-[11px] font-black text-white/70 ring-1 ring-white/10 transition hover:bg-[#e50914] hover:text-white md:px-4 md:text-xs">{example}</button>
            ))}
          </div>
        </div>

        <p className="mt-5 text-xs font-semibold leading-5 text-white/36">ระบบจะลองจับคำใกล้เคียงให้ แม้พิมพ์ชื่อเรื่องไม่ตรงทั้งหมด</p>
      </section>
    </div>
  );
}

export function HomeExperienceV3({ home }: { home: HomePayload }) {
  const [shuffleSeed] = useState(() => dailySeed());
  const [liveSeed, setLiveSeed] = useState(shuffleSeed);
  const [smartSearchOpen, setSmartSearchOpen] = useState(false);
  const liveRandomizedSections = useMemo(() => shuffleSections(home.sections, liveSeed), [home.sections, liveSeed]);
  const comingSoonSection = useMemo(() => liveRandomizedSections.find((section) => section.slug === 'coming-soon'), [liveRandomizedSections]);
  const regularSections = useMemo(() => liveRandomizedSections.filter((section) => section.slug !== 'coming-soon'), [liveRandomizedSections]);
  const heroItems = useMemo(() => {
    const comingSoonItems = comingSoonSection?.items || [];
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
  }, [comingSoonSection, home.hero, home.heroItems, liveRandomizedSections, liveSeed]);
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
        <nav className="mx-auto flex h-[58px] max-w-[1920px] items-center gap-2 px-4 md:h-[76px] md:gap-5 md:px-7 xl:h-[88px]">
          <a href="/" className="flex shrink-0 items-center gap-1.5 text-[21px] font-black tracking-[-0.06em] text-[#e50914] md:text-[31px] xl:text-[34px]"><span>ดูดีดี.online</span></a>
          <div className="ml-auto hidden items-center gap-5 md:flex xl:gap-7">
            <a href="/search?type=movie" className="text-sm font-black text-white/68 transition hover:text-white xl:text-base">หนัง</a>
            <a href="/search?type=tv" className="text-sm font-black text-white/68 transition hover:text-white xl:text-base">ซีรีส์</a>
            <a href="/clips" className="text-sm font-black text-white/68 transition hover:text-white xl:text-base">คลิปสั้น</a>
          </div>
          <button type="button" onClick={() => setSmartSearchOpen(true)} className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/[0.09] px-3 text-[11px] font-black text-white/82 ring-1 ring-white/10 transition hover:bg-[#e50914] hover:text-white md:ml-0 md:h-11 md:px-4 md:text-xs xl:px-5">
            <span className="max-[360px]:hidden">พิมพ์ผิดก็หาเจอ</span>
            <span className="min-[361px]:hidden">ค้นหา</span>
            <SearchIcon className="h-4 w-4 shrink-0 md:h-4.5 md:w-4.5" />
          </button>
          <div className="flex items-center gap-3 md:gap-5"><div data-dofree-menu-host="true" className="grid h-9 w-9 place-items-center md:h-12 md:w-12" /></div>
        </nav>
      </header>

      <SmartSearchModal open={smartSearchOpen} onClose={() => setSmartSearchOpen(false)} />

      <section className="relative min-h-[500px] border-b border-white/[0.08] pt-[58px] md:min-h-[585px] md:pt-[76px] xl:min-h-[610px] xl:pt-[88px]">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-y-0 right-0 h-full w-full md:w-[78%]">
            <HomeHeroMedia imageUrl={heroImage} title={hero.title} />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#030303_0%,rgba(3,3,3,0.96)_24%,rgba(3,3,3,0.78)_52%,rgba(0,0,0,0.32)_78%,#030303_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06)_0%,rgba(0,0,0,0.10)_42%,#030303_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_42%,rgba(0,0,0,0.48),transparent_18rem)]" />
        </div>
        <div className="relative z-10 mx-auto flex min-h-[442px] max-w-[1920px] flex-col justify-end px-4 pb-7 md:min-h-[509px] md:justify-center md:px-7 md:pb-0">
          <div className="max-w-[680px] md:ml-[6vw] xl:ml-[10vw]">
            <p className="mb-3 text-[13px] font-black text-[#e50914] md:mb-5 md:text-[22px]">{hero.label === 'เร็ว ๆ นี้' ? 'ภาพยนตร์กำลังจะเข้าฉาย' : hero.status === 'published' ? 'ภาพยนตร์พร้อมรับชม' : 'ภาพยนตร์เริ่มฉายล่าสุด'}</p>
            <h1 className="hero-title max-w-[92vw] text-[42px] font-black leading-[0.88] tracking-[-0.085em] text-white md:whitespace-nowrap md:text-[92px] lg:text-[112px] xl:text-[120px]">{shortTitle(hero)}</h1>
            <h2 className="mt-3 max-w-[92vw] text-[16px] font-black tracking-[-0.04em] text-white md:mt-6 md:text-[28px]">{heroEnglishReleaseLine(hero)}</h2>
            <p className="mt-2 line-clamp-3 max-w-[92vw] text-[12px] leading-5 text-white/56 md:mt-3 md:max-w-[620px] md:text-[18px] md:leading-7">{hero.overview}</p>
            <div className="mt-4 grid max-w-[92vw] grid-cols-3 gap-2 md:mt-7 md:max-w-[520px] md:gap-3">
              <a href="/watch-ready" className="inline-flex h-10 min-w-0 items-center justify-center gap-1 rounded-lg bg-[#e50914] px-2 text-[11px] font-black text-white shadow-glow md:h-12 md:px-4 md:text-sm">▶ พร้อมดู</a>
              <a href={`${mediaDetailPath(hero.mediaType, hero.id, hero.title)}#trailer`} className="inline-flex h-10 min-w-0 items-center justify-center rounded-lg bg-white/[0.12] px-2 text-[11px] font-black text-white/90 md:h-12 md:px-4 md:text-sm">ตัวอย่าง</a>
              <a href={mediaDetailPath(hero.mediaType, hero.id, hero.title)} className="inline-flex h-10 min-w-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.08] px-2 text-[11px] font-black text-white/78 md:h-12 md:px-4 md:text-sm">รายละเอียด</a>
            </div>
          </div>
        </div>
      </section>

      {comingSoonSection ? (
        <section id={comingSoonSection.slug} className="mx-auto max-w-[1920px] scroll-mt-[96px] bg-black px-4 pb-2 pt-5 md:px-7 md:pb-4 md:pt-7">
          <div className="mb-3 flex items-center justify-between md:mb-5">
            <div>
              {comingSoonSection.eyebrow ? <p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#e50914]/80">{comingSoonSection.eyebrow}</p> : null}
              <h2 className="text-[20px] font-black tracking-[-0.04em] md:text-[30px]">{comingSoonSection.title}</h2>
            </div>
            <a href={sectionHref(comingSoonSection)} className="text-[12px] font-black text-white/50 hover:text-white md:text-[16px]">ทั้งหมด ›</a>
          </div>
          <LazyMovieRail section={comingSoonSection} sectionIndex={0} />
        </section>
      ) : (
        <section className="mx-auto max-w-[1920px] bg-black px-4 pb-2 pt-5 md:px-7 md:pb-4 md:pt-7">
          <ClipsComingSoonSection />
        </section>
      )}

      <div className="mx-auto max-w-[1920px] bg-black px-4 pt-4 md:px-7 md:pt-5">
        <AdSlot code="AD-PC-H01" className="mx-auto max-w-5xl" />
        <AdSlot code="AD-MB-H01" className="mx-auto max-w-sm" />
      </div>

      <section id="sections" className="mx-auto max-w-[1920px] scroll-mt-[120px] bg-black px-4 py-7 md:px-7 md:py-10">
        <div className="space-y-8 md:space-y-12">
          {regularSections.map((section, sectionIndex) => (
            <div id={section.slug} key={section.slug} className="relative scroll-mt-[96px]" style={{ contentVisibility: sectionIndex > 1 ? 'auto' : 'visible', containIntrinsicSize: '360px 1000px' }}>
              <div className="mb-3 flex items-center justify-between md:mb-6"><div>{section.eyebrow ? <p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#e50914]/80">{section.eyebrow}</p> : null}<h2 className="text-[20px] font-black tracking-[-0.04em] md:text-[30px]">{section.title}</h2></div><a href={sectionHref(section)} className="text-[12px] font-black text-white/50 hover:text-white md:text-[16px]">ทั้งหมด ›</a></div>
              {sectionIndex === 2 ? (
                <div className="mb-6">
                  <AdSlot code="AD-PC-H04" className="mx-auto max-w-5xl" />
                  <AdSlot code="AD-MB-H04" className="mx-auto max-w-sm" />
                </div>
              ) : null}
              <LazyMovieRail section={section} sectionIndex={sectionIndex + 1} />
            </div>
          ))}
        </div>
      </section>

    </main>
  );
}
