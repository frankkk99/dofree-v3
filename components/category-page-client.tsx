'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AdSlot } from '@/components/ad-slot';
import { MovieCard } from '@/components/movie-card';
import type { MovieItem } from '@/lib/tmdb';

type CategoryPageClientProps = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  initialItems: MovieItem[];
};

type SectionItemsPayload = {
  ok?: boolean;
  items?: MovieItem[];
  hasMore?: boolean;
};

const CATEGORY_BATCH_SIZE = 24;

function uniqueMovies(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(`${item.mediaType}-${item.id}`, item);
  return [...map.values()];
}

export function CategoryPageClient({ slug, eyebrow, title, description, initialItems }: CategoryPageClientProps) {
  const [items, setItems] = useState(() => uniqueMovies(initialItems));
  const [offset, setOffset] = useState(initialItems.length);
  const [hasMore, setHasMore] = useState(initialItems.length >= CATEGORY_BATCH_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadingGuardRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingGuardRef.current || loadingMore || !hasMore) return;
    loadingGuardRef.current = true;
    setLoadingMore(true);
    setError('');

    try {
      const response = await fetch(`/api/catalog/section?slug=${encodeURIComponent(slug)}&limit=${CATEGORY_BATCH_SIZE}&offset=${offset}`, { cache: 'no-store' });
      const payload = (await response.json()) as SectionItemsPayload;
      const nextItems = Array.isArray(payload.items) ? payload.items : [];
      setItems((current) => uniqueMovies([...current, ...nextItems]));
      setOffset((current) => current + nextItems.length);
      setHasMore(Boolean(payload.hasMore) && nextItems.length > 0);
    } catch {
      setError('โหลดรายการเพิ่มไม่สำเร็จ');
      setHasMore(false);
    } finally {
      loadingGuardRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, offset, slug]);

  useEffect(() => {
    if (!hasMore || typeof IntersectionObserver === 'undefined') return;
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void loadMore();
    }, { rootMargin: '900px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <main className="min-h-screen bg-[#030303] pb-[calc(11rem+env(safe-area-inset-bottom))] text-white">
      <section className="relative overflow-hidden border-b border-white/10 px-4 py-16 md:px-6 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(229,9,20,0.22),transparent_30rem),linear-gradient(180deg,#090101,#030303)]" />
        <div className="relative z-10 mx-auto max-w-[1440px]">
          <a href="/" className="inline-flex rounded-full bg-white/[0.06] px-3 py-2 text-xs font-black text-red-100/80 hover:bg-white/[0.10] hover:text-white md:text-sm">← กลับหน้าแรก</a>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.34em] text-[#e50914]">{eyebrow}</p>
          <h1 className="mt-3 text-5xl font-black tracking-[-0.08em] md:text-7xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm font-bold leading-7 text-white/52 md:text-lg md:leading-8">{description}</p>
          <div className="mt-8 flex flex-wrap gap-3 text-xs font-black text-white/65">
            <span className="rounded-full bg-[#e50914] px-4 py-2 text-white">โหลดแล้ว {items.length}</span>
            <span className="rounded-full bg-white/10 px-4 py-2">เลื่อนลงเพื่อโหลดเพิ่ม</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-3 py-6 md:px-6 md:py-10">
        <div className="mb-6">
          <AdSlot code="AD-PC-CAT01" className="mx-auto max-w-5xl" />
          <AdSlot code="AD-MB-CAT01" className="mx-auto max-w-sm" />
        </div>

        {items.length ? (
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-6 md:gap-4 lg:grid-cols-7 xl:grid-cols-8">
            {items.map((item, index) => <MovieCard key={`category-${slug}-${item.mediaType}-${item.id}-${index}`} item={item} grid priority={index < 8} priorityBadge={index % 6 === 0 ? title : undefined} />)}
          </div>
        ) : (
          <div className="rounded-[24px] bg-white/[0.045] p-6 text-center text-sm font-bold text-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">ยังไม่มีรายการในหมวดนี้</div>
        )}

        {error ? <div className="mt-5 rounded-2xl bg-[#e50914]/12 px-4 py-3 text-center text-xs font-bold text-red-100">{error}</div> : null}

        <div ref={loadMoreRef} className="min-h-12 py-8 text-center">
          {loadingMore ? <span className="text-xs font-black text-white/45">กำลังโหลดเพิ่ม...</span> : hasMore ? <span className="text-xs font-black text-white/32">เลื่อนลงเพื่อโหลดเพิ่ม</span> : items.length ? <span className="text-xs font-black text-white/26">แสดงครบหมวดแล้ว</span> : null}
        </div>
      </section>
    </main>
  );
}
