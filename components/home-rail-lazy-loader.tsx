'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MovieCard } from '@/components/movie-card';
import type { HomePayload, MovieItem, MovieSection } from '@/lib/tmdb';

type Target = { rail: HTMLElement; section: MovieSection };
const STEP = 9;

function Skeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-[176px] w-[116px] shrink-0 animate-pulse rounded-[8px] bg-white/[0.055] sm:h-[220px] sm:w-[140px] md:h-[280px] md:w-[180px] xl:h-[300px] xl:w-[196px]" />
      ))}
    </>
  );
}

function RailPortal({ rail, section }: Target) {
  const [items, setItems] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(STEP);

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/catalog/section?slug=${encodeURIComponent(section.slug)}&limit=${STEP}&offset=${offset}`, { cache: 'no-store' });
      const payload = (await response.json()) as { ok?: boolean; items?: MovieItem[]; hasMore?: boolean };
      const next = payload.items || [];
      setItems((current) => [...current, ...next]);
      setOffset((current) => current + next.length);
      setHasMore(Boolean(payload.hasMore && next.length));
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <>
      {items.map((item, index) => (
        <MovieCard key={`lazy-${section.slug}-${item.mediaType}-${item.id}-${index}`} item={item} priority={false} priorityBadge={index % 3 === 0 ? 'เพิ่มใหม่' : undefined} />
      ))}
      {hasMore ? (
        loading ? <Skeleton /> : (
          <button type="button" onClick={() => void loadMore()} className="grid h-[176px] w-[116px] shrink-0 place-items-center rounded-[8px] border border-white/8 bg-white/[0.035] px-3 text-center text-[10px] font-black text-white/44 backdrop-blur-xl sm:h-[220px] sm:w-[140px] md:h-[280px] md:w-[180px] md:text-xs xl:h-[300px] xl:w-[196px]">
            โหลดเพิ่มอีก 9 เรื่อง
          </button>
        )
      ) : null}
    </>,
    rail,
  );
}

export function HomeRailLazyLoader({ home }: { home: HomePayload }) {
  const [targets, setTargets] = useState<Target[]>([]);

  useEffect(() => {
    function sync() {
      const rails = Array.from(document.querySelectorAll('#sections .movie-rail')).filter((node): node is HTMLElement => node instanceof HTMLElement);
      setTargets(rails.map((rail, index) => ({ rail, section: home.sections[index] })).filter((target) => Boolean(target.section)));
    }

    sync();
    const timer = window.setTimeout(sync, 700);
    window.addEventListener('resize', sync);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', sync);
    };
  }, [home.sections]);

  return <>{targets.map((target) => <RailPortal key={target.section.slug} rail={target.rail} section={target.section} />)}</>;
}
