'use client';

import { useEffect, useMemo, useState } from 'react';
import { MovieCard } from '@/components/movie-card';
import type { HomePayload, MovieItem } from '@/lib/tmdb';

type SearchCategory = {
  slug: string;
  title: string;
  subtitle?: string | null;
  sortOrder?: number;
};

type CategoryPayload = {
  ok?: boolean;
  categories?: SearchCategory[];
};

type SearchPayload = {
  ok?: boolean;
  items?: MovieItem[];
};

const SEARCH_LIMIT = 48;

function fallbackCategories(home: HomePayload): SearchCategory[] {
  return home.sections.map((section, index) => ({
    slug: section.slug,
    title: section.title,
    subtitle: section.eyebrow || section.description,
    sortOrder: index,
  }));
}

export function FloatingGlassSearch({ home }: { home: HomePayload }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [categories, setCategories] = useState<SearchCategory[]>(() => fallbackCategories(home));
  const [items, setItems] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const activeTitle = useMemo(() => categories.find((category) => category.slug === activeCategory)?.title || '', [activeCategory, categories]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/categories', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload: CategoryPayload) => {
        if (!cancelled && payload.ok && Array.isArray(payload.categories) && payload.categories.length) {
          setCategories(payload.categories);
        }
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function runSearch(nextQuery = query, nextCategory = activeCategory) {
    const cleanQuery = nextQuery.trim();
    const cleanCategory = nextCategory.trim();
    setLoading(true);
    setSearched(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (cleanQuery) params.set('q', cleanQuery);
      if (cleanCategory) params.set('category', cleanCategory);
      params.set('limit', String(SEARCH_LIMIT));
      const response = await fetch(`/api/search?${params.toString()}`, { cache: 'no-store' });
      const payload = (await response.json()) as SearchPayload;
      setItems(Array.isArray(payload.items) ? payload.items : []);
    } catch {
      setItems([]);
      setError('ค้นหาไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }

  function chooseCategory(slug: string) {
    const nextCategory = activeCategory === slug ? '' : slug;
    setActiveCategory(nextCategory);
    void runSearch(query, nextCategory);
  }

  function clearSearch() {
    setQuery('');
    setActiveCategory('');
    setItems([]);
    setSearched(false);
    setError('');
  }

  return (
    <>
      <button
        type="button"
        aria-label="เปิดค้นหา"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-4 z-[75] grid h-[58px] w-[58px] place-items-center rounded-[22px] bg-white/[0.085] text-white shadow-[0_22px_80px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-18px_42px_rgba(255,255,255,0.035)] backdrop-blur-2xl transition hover:scale-105 md:bottom-7 md:right-7"
      >
        <span className="absolute inset-0 rounded-[22px] bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.24),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))]" />
        <span className="relative grid h-10 w-10 place-items-center rounded-[16px] bg-black/28 text-[20px] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">⌕</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/50 px-3 py-4 text-white backdrop-blur-[5px]">
          <div className="mx-auto max-w-6xl rounded-[34px] bg-black/62 p-3 shadow-[0_44px_140px_rgba(0,0,0,0.92),inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-38px_90px_rgba(255,255,255,0.035)] backdrop-blur-3xl md:p-5">
            <div className="rounded-[28px] bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-24px_70px_rgba(0,0,0,0.35)] md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#e50914]">Search</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.06em] md:text-4xl">ค้นหาตามหมวดหลังบ้าน</h2>
                  <p className="mt-1 text-xs font-bold text-white/42">เลือกหมวดแล้วระบบจะค้นหาให้อัตโนมัติ</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[0.08] text-xl font-black text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[#e50914] hover:text-white"
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void runSearch();
                }}
                className="mt-5 rounded-[26px] bg-black/46 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_22px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl"
              >
                <div className="flex h-12 items-center gap-2 rounded-[19px] bg-white/[0.07] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
                  <span className="text-lg text-white/58">⌕</span>
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ค้นหาหนัง ซีรีส์ หรือคำสำคัญ"
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/36"
                  />
                  {query ? (
                    <button type="button" onClick={() => setQuery('')} className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.10] text-sm text-white/75">×</button>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => chooseCategory('')}
                    className={`h-8 rounded-full px-3 text-[10px] font-black transition ${!activeCategory ? 'bg-white text-black shadow-[0_10px_35px_rgba(255,255,255,0.18)]' : 'bg-white/[0.075] text-white/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/[0.12] hover:text-white'}`}
                  >
                    ทั้งหมด
                  </button>
                  {categories.map((category) => {
                    const active = activeCategory === category.slug;
                    return (
                      <button
                        key={category.slug}
                        type="button"
                        onClick={() => chooseCategory(category.slug)}
                        className={`h-8 rounded-full px-3 text-[10px] font-black transition ${active ? 'bg-[#e50914] text-white shadow-[0_14px_45px_rgba(229,9,20,0.35)]' : 'bg-white/[0.075] text-white/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/[0.12] hover:text-white'}`}
                        title={category.slug}
                      >
                        {category.title}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex gap-2">
                  <button type="submit" className="h-11 flex-1 rounded-[17px] bg-[#e50914] text-xs font-black text-white shadow-[0_18px_52px_rgba(229,9,20,0.38)]">ค้นหา</button>
                  <button type="button" onClick={clearSearch} className="h-11 w-[84px] rounded-[17px] bg-white/[0.075] text-xs font-black text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/[0.12] hover:text-white">ล้าง</button>
                </div>
              </form>

              <div className="mt-5">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">Results</p>
                    <h3 className="mt-1 text-xl font-black tracking-[-0.04em]">
                      {activeTitle ? `หมวด: ${activeTitle}` : query.trim() ? `ค้นหา “${query.trim()}”` : 'ผลลัพธ์ทั้งหมด'}
                    </h3>
                  </div>
                  <p className="text-[11px] font-bold text-white/38">{loading ? 'กำลังค้นหา...' : searched ? `พบ ${items.length} เรื่อง` : 'เลือกหมวดหรือพิมพ์คำค้นหา'}</p>
                </div>

                {error ? <div className="mb-3 rounded-2xl bg-[#e50914]/12 px-4 py-3 text-xs font-bold text-red-100">{error}</div> : null}

                {loading ? (
                  <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-6 md:gap-4 lg:grid-cols-7 xl:grid-cols-8">
                    {Array.from({ length: 16 }).map((_, index) => <div key={index} className="aspect-[2/3] animate-pulse rounded-lg bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" />)}
                  </div>
                ) : items.length ? (
                  <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-6 md:gap-4 lg:grid-cols-7 xl:grid-cols-8">
                    {items.map((item, index) => <MovieCard key={`server-search-${item.mediaType}-${item.id}-${index}`} item={item} grid priority={index < 4} priorityBadge={activeTitle || undefined} />)}
                  </div>
                ) : searched ? (
                  <div className="rounded-[24px] bg-white/[0.045] p-6 text-center text-sm font-bold text-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">ไม่พบหนังที่ตรงกับเงื่อนไขนี้</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
