'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MovieItem } from '@/lib/tmdb';
import { MovieCard } from '@/components/movie-card';

const AUTO_SPEED = 42;
const RESUME_DELAY = 2600;

export function DetailRecommendationCarousel({ current, items }: { current: MovieItem; items: MovieItem[] }) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const interactionPausedUntilRef = useRef(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const safeItems = useMemo(() => items.filter((item) => `${item.mediaType}-${item.id}` !== `${current.mediaType}-${current.id}`), [current.id, current.mediaType, items]);
  const carouselItems = useMemo(() => (safeItems.length > 4 ? [...safeItems, ...safeItems] : safeItems), [safeItems]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || carouselItems.length < 4) return;

    function pauseAfterInteraction() {
      interactionPausedUntilRef.current = performance.now() + RESUME_DELAY;
    }

    function tick(now: number) {
      const currentRail = railRef.current;
      if (!currentRail) return;

      const last = lastFrameRef.current || now;
      const delta = Math.min(now - last, 64);
      lastFrameRef.current = now;

      const canScroll = currentRail.scrollWidth > currentRail.clientWidth + 8;
      const interactionPaused = now < interactionPausedUntilRef.current;

      if (canScroll && !hoverPaused && !interactionPaused) {
        currentRail.scrollLeft += (AUTO_SPEED * delta) / 1000;
        const halfway = currentRail.scrollWidth / 2;
        if (safeItems.length > 4 && halfway > 0 && currentRail.scrollLeft >= halfway) currentRail.scrollLeft -= halfway;
      }

      frameRef.current = window.requestAnimationFrame(tick);
    }

    rail.addEventListener('pointerdown', pauseAfterInteraction, { passive: true });
    rail.addEventListener('pointerup', pauseAfterInteraction, { passive: true });
    rail.addEventListener('touchstart', pauseAfterInteraction, { passive: true });
    rail.addEventListener('touchmove', pauseAfterInteraction, { passive: true });
    rail.addEventListener('wheel', pauseAfterInteraction, { passive: true });
    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      lastFrameRef.current = 0;
      rail.removeEventListener('pointerdown', pauseAfterInteraction);
      rail.removeEventListener('pointerup', pauseAfterInteraction);
      rail.removeEventListener('touchstart', pauseAfterInteraction);
      rail.removeEventListener('touchmove', pauseAfterInteraction);
      rail.removeEventListener('wheel', pauseAfterInteraction);
    };
  }, [carouselItems.length, hoverPaused, safeItems.length]);

  if (!safeItems.length) {
    return (
      <div className="rounded-2xl bg-black/28 p-4 text-center text-xs font-bold text-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-xl md:text-sm">
        ยังไม่มีรายการแนะนำเพิ่มเติม
      </div>
    );
  }

  return (
    <div
        ref={railRef}
        onMouseEnter={() => setHoverPaused(true)}
        onMouseLeave={() => setHoverPaused(false)}
        className="movie-rail flex w-full max-w-full min-w-0 gap-2.5 overflow-x-auto overflow-y-hidden pb-2 sm:gap-3 md:gap-4"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {carouselItems.map((movie, index) => (
          <MovieCard
            key={`detail-recommend-${movie.mediaType}-${movie.id}-${index}`}
            item={movie}
            compact
            priorityBadge={index % 2 === 0 ? 'แนะนำ' : undefined}
          />
        ))}
    </div>
  );
}
