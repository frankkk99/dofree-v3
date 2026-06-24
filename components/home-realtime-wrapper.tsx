'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { HomePayload, MovieItem } from '@/lib/tmdb';
import { HomeExperienceV3 } from '@/components/home-experience-v3';
import { MovieCard } from '@/components/movie-card';

function unique(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(`${item.mediaType}-${item.id}`, item);
  return [...map.values()];
}

function recentlyAdded(home: HomePayload) {
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
  const [paused, setPaused] = useState(false);
  const doubled = useMemo(() => [...items, ...items], [items]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || paused || items.length < 4) return;

    const timer = window.setInterval(() => {
      const nextLeft = rail.scrollLeft + 210;
      const half = rail.scrollWidth / 2;
      if (nextLeft >= half) {
        rail.scrollTo({ left: 0, behavior: 'auto' });
      } else {
        rail.scrollTo({ left: nextLeft, behavior: 'smooth' });
      }
    }, 2600);

    return () => window.clearInterval(timer);
  }, [items.length, paused]);

  function pauseThenResume() {
    setPaused(true);
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => setPaused(false), 2000);
  }

  if (!items.length) return null;

  return (
    <section className="mx-auto max-w-[1920px] bg-[#030303] px-4 pb-4 pt-2 md:px-7 md:pb-6 md:pt-3">
      <div className="mb-3 flex items-end justify-between gap-3 md:mb-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#e50914]/80">Live Updated</p>
          <h2 className="mt-1 text-[20px] font-black tracking-[-0.04em] md:text-[30px]">หนังเข้าใหม่</h2>
          <p className="mt-1 text-[11px] font-semibold text-white/42">อัปเดตจากรายการล่าสุดในระบบ • เลื่อนอัตโนมัติและปัดเองได้</p>
        </div>
        <span className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[10px] font-black text-white/52">Auto loop</span>
      </div>

      <div
        ref={railRef}
        onPointerDown={pauseThenResume}
        onPointerUp={pauseThenResume}
        onTouchEnd={pauseThenResume}
        onWheel={pauseThenResume}
        className="movie-rail flex gap-2.5 overflow-x-auto pb-3 sm:gap-3 md:gap-5 md:pb-4"
      >
        {doubled.map((item, index) => (
          <MovieCard
            key={`realtime-${item.mediaType}-${item.id}-${index}`}
            item={item}
            onSelect={() => window.dispatchEvent(new CustomEvent('dofree:open-movie', { detail: item }))}
            priority={index < 8}
            priorityBadge={index % 3 === 0 ? 'เข้าใหม่' : index % 3 === 1 ? 'พร้อมดู' : undefined}
          />
        ))}
      </div>
    </section>
  );
}

function RealtimePortal({ home }: { home: HomePayload }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const items = useMemo(() => recentlyAdded(home), [home]);

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
    function handleOpen(event: Event) {
      const item = (event as CustomEvent<MovieItem>).detail;
      const buttons = Array.from(document.querySelectorAll('button'));
      const matched = buttons.find((button) => button.getAttribute('aria-label')?.includes(item.title));
      matched?.click();
    }

    window.addEventListener('dofree:open-movie', handleOpen);
    return () => window.removeEventListener('dofree:open-movie', handleOpen);
  }, []);

  return host ? createPortal(<RealtimeAddedCarousel items={items} />, host) : null;
}

export function HomeRealtimeWrapper({ home }: { home: HomePayload }) {
  return (
    <>
      <HomeExperienceV3 home={home} />
      <RealtimePortal home={home} />
    </>
  );
}
