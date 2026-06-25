'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { HomePayload, MovieItem } from '@/lib/tmdb';
import { HomeExperienceV3 } from '@/components/home-experience-v3';
import { MovieCard } from '@/components/movie-card';
import { releaseMonthYear } from '@/lib/release-date';

function unique(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(`${item.mediaType}-${item.id}`, item);
  return [...map.values()];
}

function shortTitle(item: MovieItem) {
  return item.title.length > 14 ? item.title.slice(0, 13) : item.title;
}

function fallbackRecentlyAdded(home: HomePayload) {
  const watchReady = home.sections.find((section) => section.slug === 'watch-ready')?.items || [];
  const nowPlaying = home.sections.find((section) => section.slug === 'now-playing')?.items || [];
  const popular = home.sections.find((section) => section.slug === 'popular')?.items || [];
  return unique([
    ...watchReady.filter((item) => item.isWatchReady || item.watchUrl || item.status === 'published'),
    ...nowPlaying,
    ...popular,
    ...home.sections.flatMap((section) => section.items.slice(0, 8)),
  ]).slice(0, 36);
}

function railFromTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest('.movie-rail') as HTMLElement | null;
}

function DesktopRailScrollFix() {
  useEffect(() => {
    let activeRail: HTMLElement | null = null;
    let startX = 0;
    let startLeft = 0;
    let dragged = false;

    function onWheel(event: WheelEvent) {
      const rail = railFromTarget(event.target);
      if (!rail || rail.scrollWidth <= rail.clientWidth) return;

      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;

      event.preventDefault();
      rail.scrollLeft += delta;
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === 'touch') return;
      const rail = railFromTarget(event.target);
      if (!rail || rail.scrollWidth <= rail.clientWidth) return;

      activeRail = rail;
      startX = event.clientX;
      startLeft = rail.scrollLeft;
      dragged = false;
      rail.style.cursor = 'grabbing';
      rail.style.userSelect = 'none';
    }

    function onPointerMove(event: PointerEvent) {
      if (!activeRail) return;
      const dx = event.clientX - startX;
      if (Math.abs(dx) > 4) dragged = true;
      if (dragged) event.preventDefault();
      activeRail.scrollLeft = startLeft - dx;
    }

    function stopDrag() {
      if (activeRail) {
        activeRail.style.cursor = '';
        activeRail.style.userSelect = '';
      }
      activeRail = null;
      window.setTimeout(() => {
        dragged = false;
      }, 0);
    }

    function onClick(event: MouseEvent) {
      if (!dragged) return;
      if (!railFromTarget(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    }

    document.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove, { passive: false });
    document.addEventListener('pointerup', stopDrag);
    document.addEventListener('pointercancel', stopDrag);
    document.addEventListener('click', onClick, true);

    return () => {
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', stopDrag);
      document.removeEventListener('pointercancel', stopDrag);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  return null;
}

function RealtimeAddedCarousel({ items }: { items: MovieItem[] }) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);
  const doubled = useMemo(() => [...items, ...items], [items]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || items.length < 4) return;

    const pixelsPerSecond = 18;

    function tick(now: number) {
      if (!rail) return;
      const last = lastFrameRef.current ?? now;
      const delta = Math.min(now - last, 64);
      lastFrameRef.current = now;

      if (!paused) {
        rail.scrollLeft += (pixelsPerSecond * delta) / 1000;
        const half = rail.scrollWidth / 2;
        if (half > 0 && rail.scrollLeft >= half) rail.scrollLeft -= half;
      }

      frameRef.current = window.requestAnimationFrame(tick);
    }

    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      lastFrameRef.current = null;
    };
  }, [items.length, paused]);

  function pauseThenResume() {
    setPaused(true);
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      lastFrameRef.current = null;
      setPaused(false);
    }, 2000);
  }

  if (!items.length) return null;

  return (
    <section className="mx-auto max-w-[1920px] bg-[#030303] px-4 pb-4 pt-2 md:px-7 md:pb-6 md:pt-3">
      <div className="mb-3 flex items-end justify-between gap-3 md:mb-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#e50914]/80">Release Window</p>
          <h2 className="mt-1 text-[20px] font-black tracking-[-0.04em] md:text-[30px]">หนังเข้าใหม่ / กำลังจะเข้า</h2>
          <p className="mt-1 text-[11px] font-semibold text-white/42">ช่วงย้อนหลัง 2 เดือนถึงหนังที่กำลังจะเข้าฉาย • ไหลช้าแบบต่อเนื่อง</p>
        </div>
        <span className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[10px] font-black text-white/52">Slow loop</span>
      </div>

      <div
        ref={railRef}
        onPointerDown={pauseThenResume}
        onPointerUp={pauseThenResume}
        onTouchEnd={pauseThenResume}
        onWheel={pauseThenResume}
        className="movie-rail flex cursor-grab gap-2.5 overflow-x-auto scroll-smooth pb-3 sm:gap-3 md:gap-5 md:pb-4"
      >
        {doubled.map((item, index) => (
          <MovieCard
            key={`realtime-${item.mediaType}-${item.id}-${index}`}
            item={item}
            priority={index < 8}
            priorityBadge={item.label || (index % 3 === 0 ? 'เข้าใหม่' : index % 3 === 1 ? 'พร้อมดู' : undefined)}
          />
        ))}
      </div>
    </section>
  );
}

function HeroReleasePortal({ home }: { home: HomePayload }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [label, setLabel] = useState(releaseMonthYear(home.hero as MovieItem & { releaseDate?: string }));

  const heroCandidates = useMemo(
    () => unique([home.hero, ...(home.heroItems || []), ...home.sections.flatMap((section) => section.items)]),
    [home]
  );

  useEffect(() => {
    function findHeroLabelHost() {
      const paragraphs = Array.from(document.querySelectorAll('p'));
      const target = paragraphs.find((paragraph) => {
        const text = paragraph.textContent || '';
        return text.includes('ภาพยนตร์พร้อมรับชม') || text.includes('ภาพยนตร์สุ่มแนะนำ');
      });
      if (target) setHost(target);
    }

    function syncCurrentHeroRelease() {
      const currentTitle = document.querySelector('h1.hero-title')?.textContent?.trim() || '';
      const match = heroCandidates.find((item) => shortTitle(item) === currentTitle || item.title === currentTitle);
      setLabel(releaseMonthYear((match || home.hero) as MovieItem & { releaseDate?: string }));
    }

    findHeroLabelHost();
    syncCurrentHeroRelease();
    const timer = window.setInterval(() => {
      findHeroLabelHost();
      syncCurrentHeroRelease();
    }, 800);

    return () => window.clearInterval(timer);
  }, [heroCandidates, home.hero]);

  if (!host) return null;

  return createPortal(
    <span className="ml-2 text-white/90">• เข้าฉาย {label}</span>,
    host
  );
}

function RealtimePortal({ home }: { home: HomePayload }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [liveItems, setLiveItems] = useState<MovieItem[]>([]);
  const fallbackItems = useMemo(() => fallbackRecentlyAdded(home), [home]);
  const items = liveItems.length ? liveItems : fallbackItems;

  useEffect(() => {
    const searchSection = document.querySelector('main section.sticky');
    if (!searchSection?.parentElement) return;

    let node = document.getElementById('realtime-added-host');
    if (!node) {
      node = document.createElement('div');
      node.id = 'realtime-added-host';
      searchSection.insertAdjacentElement('afterend', node);
    }
    setHost(node);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadRecent() {
      try {
        const response = await fetch('/api/catalog/recent', { cache: 'no-store' });
        const payload = (await response.json()) as { ok?: boolean; items?: MovieItem[] };
        if (active && payload.ok && payload.items?.length) setLiveItems(payload.items);
      } catch {}
    }

    void loadRecent();
    const timer = window.setInterval(loadRecent, 60_000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return host ? createPortal(<RealtimeAddedCarousel items={items} />, host) : null;
}

export function HomeRealtimeWrapper({ home }: { home: HomePayload }) {
  return (
    <>
      <HomeExperienceV3 home={home} />
      <DesktopRailScrollFix />
      <HeroReleasePortal home={home} />
      <RealtimePortal home={home} />
    </>
  );
}
