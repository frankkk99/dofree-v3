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
        className="movie-rail flex gap-2.5 overflow-x-auto scroll-smooth pb-3 sm:gap-3 md:gap-5 md:pb-4"
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

function openCurrentHeroDetail() {
  const buttons = Array.from(document.querySelectorAll('button'));
  const detailButton = buttons.find((button) => button.textContent?.includes('รายละเอียด'));
  detailButton?.click();
}

function HeroReleasePortal({ home }: { home: HomePayload }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const label = releaseMonthYear(home.hero as MovieItem & { releaseDate?: string });

  useEffect(() => {
    const heroSection = document.querySelector('main > section.relative');
    if (!heroSection) return;

    let node = document.getElementById('hero-release-host');
    if (!node) {
      node = document.createElement('div');
      node.id = 'hero-release-host';
      heroSection.appendChild(node);
    }
    setHost(node);
  }, []);

  if (!host) return null;

  return createPortal(
    <div className="pointer-events-none absolute bottom-5 right-4 z-20 flex flex-col items-end gap-2 md:bottom-8 md:right-8">
      <span className="rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-[10px] font-black text-white/80 shadow-[0_14px_40px_rgba(0,0,0,0.52)] backdrop-blur-xl md:text-xs">
        เข้าฉาย {label}
      </span>
      <button
        type="button"
        onClick={openCurrentHeroDetail}
        className="pointer-events-auto rounded-xl bg-white/[0.12] px-4 py-2 text-[11px] font-black text-white/86 shadow-[0_14px_46px_rgba(0,0,0,0.55)] backdrop-blur-xl transition hover:bg-[#e50914] md:px-5 md:py-3 md:text-sm"
      >
        ดูการ์ดเรื่องนี้
      </button>
    </div>,
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
      <HeroReleasePortal home={home} />
      <RealtimePortal home={home} />
    </>
  );
}
