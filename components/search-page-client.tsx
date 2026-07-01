'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MovieCard } from '@/components/movie-card';
import type { MovieItem } from '@/lib/tmdb';

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
  total?: number;
  hasMore?: boolean;
};

type FilterState = {
  category: string;
  type: string;
  country: string;
  language: string;
  quality: string;
  year: string;
  sort: string;
};

type SearchPageClientProps = {
  initialQuery?: string;
  initialFilters?: Partial<FilterState>;
};

const SEARCH_LIMIT = 8;
const defaultFilters: FilterState = {
  category: '',
  type: '',
  country: '',
  language: '',
  quality: '',
  year: '',
  sort: 'rating-desc',
};

const selectClass = 'h-10 w-full min-w-0 appearance-none truncate rounded-[14px] border border-white/8 bg-white/[0.075] px-3 pr-7 text-[11px] font-black text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl focus:border-[#e50914]/70 focus:ring-2 focus:ring-[#e50914]/30 md:h-11 md:rounded-[16px] md:text-xs';

const typeOptions = [
  { value: '', label: 'ทุกประเภท' },
  { value: 'movie', label: 'ภาพยนตร์' },
  { value: 'tv', label: 'ซีรีส์' },
];

const countryOptions = [
  { value: '', label: 'ทุกประเทศ' },
  { value: 'th', label: 'ไทย' },
  { value: 'kr', label: 'เกาหลี' },
  { value: 'jp', label: 'ญี่ปุ่น' },
  { value: 'cn', label: 'จีน' },
  { value: 'us', label: 'อเมริกา' },
  { value: 'uk', label: 'อังกฤษ' },
  { value: 'in', label: 'อินเดีย' },
];

const languageOptions = [
  { value: '', label: 'ทุกภาษา' },
  { value: 'th', label: 'ไทย' },
  { value: 'en', label: 'อังกฤษ' },
  { value: 'ko', label: 'เกาหลี' },
  { value: 'ja', label: 'ญี่ปุ่น' },
  { value: 'zh', label: 'จีน' },
  { value: 'hi', label: 'ฮินดี' },
];

const qualityOptions = [
  { value: '', label: 'ทุกความชัด' },
  { value: 'ready', label: 'พร้อมดู' },
  { value: 'hd', label: 'HD' },
  { value: 'review', label: 'รีวิว' },
];

const yearOptions = [
  { value: '', label: 'ทุกปี' },
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2022', label: '2022' },
  { value: '2020s', label: '2020s' },
  { value: '2010s', label: '2010s' },
  { value: 'before-2010', label: 'ก่อน 2010' },
];

const sortOptions = [
  { value: 'rating-desc', label: 'คะแนนมาก→น้อย' },
  { value: 'rating-asc', label: 'คะแนนน้อย→มาก' },
  { value: 'year-desc', label: 'ปีใหม่→เก่า' },
  { value: 'year-asc', label: 'ปีเก่า→ใหม่' },
];

function FilterSelect({ value, options, onChange, label }: { value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; label: string }) {
  return (
    <label className="relative min-w-0">
      <span className="sr-only">{label}</span>
      <select className={selectClass} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={`${label}-${option.value || 'all'}`} value={option.value}>{option.label}</option>)}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/45">⌄</span>
    </label>
  );
}

function normalizeInitialFilters(value?: Partial<FilterState>) {
  return { ...defaultFilters, ...value };
}

function buildParams(query: string, filters: FilterState, limit = SEARCH_LIMIT, offset = 0) {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (filters.category) params.set('category', filters.category);
  if (filters.type) params.set('type', filters.type);
  if (filters.country) params.set('country', filters.country);
  if (filters.language) params.set('language', filters.language);
  if (filters.quality) params.set('quality', filters.quality);
  if (filters.year) params.set('year', filters.year);
  if (filters.sort) params.set('sort', filters.sort);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return params;
}

function hasAdvancedInitialFilter(value?: Partial<FilterState>) {
  return Boolean(value?.country || value?.language || value?.quality || value?.year || (value?.sort && value.sort !== defaultFilters.sort));
}

export function SearchPageClient({ initialQuery = '', initialFilters }: SearchPageClientProps) {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<FilterState>(() => normalizeInitialFilters(initialFilters));
  const [filtersOpen, setFiltersOpen] = useState(() => hasAdvancedInitialFilter(initialFilters));
  const [categories, setCategories] = useState<SearchCategory[]>([]);
  const [items, setItems] = useState<MovieItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const categoryOptions = useMemo(() => [{ value: '', label: 'ทุกหมวด' }, ...categories.map((category) => ({ value: category.slug, label: category.title }))], [categories]);
  const activeTitle = useMemo(() => categories.find((category) => category.slug === filters.category)?.title || '', [filters.category, categories]);
  const activeFilterCount = useMemo(() => Object.entries(filters).filter(([key, value]) => key !== 'sort' && Boolean(value)).length + (filters.sort !== defaultFilters.sort ? 1 : 0), [filters]);
  const filterSummary = useMemo(() => {
    const selected = [
      activeTitle,
      typeOptions.find((option) => option.value === filters.type && option.value)?.label,
      countryOptions.find((option) => option.value === filters.country && option.value)?.label,
      languageOptions.find((option) => option.value === filters.language && option.value)?.label,
      qualityOptions.find((option) => option.value === filters.quality && option.value)?.label,
      yearOptions.find((option) => option.value === filters.year && option.value)?.label,
    ].filter(Boolean);
    return selected.length ? selected.join(' · ') : '';
  }, [activeTitle, filters]);

  const runSearch = useCallback(async (nextQuery = query, nextFilters = filters, append = false, nextOffset = 0) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setOffset(0);
      setHasMore(false);
    }
    setSearched(true);
    setError('');
    try {
      const params = buildParams(nextQuery, nextFilters, SEARCH_LIMIT, nextOffset);
      const response = await fetch(`/api/search?${params.toString()}`, { cache: 'no-store' });
      const payload = (await response.json()) as SearchPayload;
      if (requestId !== requestIdRef.current) return;
      const nextItems = Array.isArray(payload.items) ? payload.items : [];
      setItems((current) => append ? [...current, ...nextItems] : nextItems);
      setTotal(Number(payload.total || nextItems.length));
      setOffset(nextOffset + nextItems.length);
      setHasMore(Boolean(payload.hasMore) && nextItems.length > 0);
      if (!append && typeof window !== 'undefined') {
        const nextUrlParams = buildParams(nextQuery, nextFilters, SEARCH_LIMIT, 0);
        nextUrlParams.delete('limit');
        nextUrlParams.delete('offset');
        const suffix = nextUrlParams.toString();
        window.history.replaceState(null, '', suffix ? `/search?${suffix}` : '/search');
      }
    } catch {
      if (requestId !== requestIdRef.current) return;
      if (!append) setItems([]);
      setTotal(0);
      setHasMore(false);
      setError('ค้นหาไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [filters, query]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/categories', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload: CategoryPayload) => {
        if (!cancelled && payload.ok && Array.isArray(payload.categories)) setCategories(payload.categories);
      })
      .catch(() => null);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    void runSearch(initialQuery, normalizeInitialFilters(initialFilters), false, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateFilter(key: keyof FilterState, value: string) {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    void runSearch(query, nextFilters, false, 0);
  }

  function clearSearch() {
    setQuery('');
    setFilters(defaultFilters);
    setItems([]);
    setTotal(0);
    setOffset(0);
    setHasMore(false);
    setLoadingMore(false);
    setSearched(false);
    setError('');
    if (typeof window !== 'undefined') window.history.replaceState(null, '', '/search');
  }

  const loadMore = useCallback(() => {
    if (!searched || loading || loadingMore || !hasMore) return;
    void runSearch(query, filters, true, offset);
  }, [filters, hasMore, loading, loadingMore, offset, query, runSearch, searched]);

  useEffect(() => {
    if (!searched || !hasMore || typeof IntersectionObserver === 'undefined') return;
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore();
    }, { rootMargin: '760px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, searched]);

  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <section className="relative border-b border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(229,9,20,0.18),transparent_16rem),linear-gradient(180deg,#080101,#030303)] px-3 pb-4 pt-[calc(env(safe-area-inset-top)+12px)] md:px-6 md:py-16">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex items-center justify-between gap-3">
            <a href="/" className="rounded-full bg-white/[0.06] px-3 py-2 text-xs font-black text-red-100/80 hover:bg-white/[0.10] hover:text-white md:text-sm">← หน้าแรก</a>
            <a href="/" aria-label="ปิดหน้าค้นหา" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.08] text-xl font-black text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[#e50914] hover:text-white md:h-12 md:w-12 md:text-2xl">×</a>
          </div>

          <div className="mt-3 flex items-end justify-between gap-4 md:mt-8">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">Search</p>
              <h1 className="mt-1 text-[34px] font-black leading-none tracking-[-0.08em] md:text-7xl">ค้นหา</h1>
            </div>
            <p className="hidden max-w-xl text-sm font-bold leading-6 text-white/45 md:block">ค้นหาหนัง ซีรีส์ และกรองด้วยหมวด ประเภท ประเทศ ภาษา ความชัด ปี และคะแนน</p>
          </div>

          <div className="mt-4 max-h-[48dvh] overflow-y-auto rounded-[24px] border border-white/10 bg-black/48 p-2.5 shadow-[0_18px_70px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl md:mt-8 md:max-h-none md:rounded-[28px] md:p-4">
            <form onSubmit={(event) => { event.preventDefault(); void runSearch(query, filters, false, 0); }}>
              <div className="grid gap-2 md:grid-cols-[minmax(280px,1fr)_auto]">
                <div className="flex h-12 items-center gap-2 rounded-[18px] bg-white/[0.08] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] md:h-13">
                  <span className="text-lg text-white/58">⌕</span>
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาหนัง ซีรีส์ หรือคำสำคัญ" className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/36 md:text-base" />
                  {query ? <button type="button" onClick={() => setQuery('')} className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.10] text-sm text-white/75">×</button> : null}
                </div>
                <button type="submit" className="h-11 rounded-[16px] bg-[#e50914] px-6 text-xs font-black text-white shadow-[0_18px_52px_rgba(229,9,20,0.38)] md:h-12 md:min-w-[130px]">ค้นหา</button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-[1.35fr_0.95fr_auto_auto]">
                <FilterSelect label="หมวดหมู่" value={filters.category} options={categoryOptions} onChange={(value) => updateFilter('category', value)} />
                <FilterSelect label="ประเภท" value={filters.type} options={typeOptions} onChange={(value) => updateFilter('type', value)} />
                <button type="button" onClick={() => setFiltersOpen((value) => !value)} className="h-10 rounded-[14px] bg-white/[0.075] px-3 text-[11px] font-black text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/[0.12] md:h-11 md:min-w-[132px]">
                  ตัวกรอง {activeFilterCount ? `(${activeFilterCount})` : ''} {filtersOpen ? '⌃' : '⌄'}
                </button>
                <button type="button" onClick={clearSearch} className="h-10 rounded-[14px] bg-white/[0.055] px-3 text-[11px] font-black text-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/[0.10] hover:text-white md:h-11 md:min-w-[92px]">ล้าง</button>
              </div>

              {filtersOpen ? (
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                  <FilterSelect label="ประเทศ" value={filters.country} options={countryOptions} onChange={(value) => updateFilter('country', value)} />
                  <FilterSelect label="ภาษา" value={filters.language} options={languageOptions} onChange={(value) => updateFilter('language', value)} />
                  <FilterSelect label="ความชัด" value={filters.quality} options={qualityOptions} onChange={(value) => updateFilter('quality', value)} />
                  <FilterSelect label="ปี" value={filters.year} options={yearOptions} onChange={(value) => updateFilter('year', value)} />
                  <FilterSelect label="เรียงคะแนน" value={filters.sort} options={sortOptions} onChange={(value) => updateFilter('sort', value)} />
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-3 py-5 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-6 md:py-10">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3 md:mb-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">ผลลัพธ์</p>
            <h2 className="mt-1 text-[24px] font-black tracking-[-0.05em] md:text-3xl">{filterSummary ? filterSummary : query.trim() ? `ค้นหา “${query.trim()}”` : 'ผลลัพธ์ทั้งหมด'}</h2>
          </div>
          <p className="text-[11px] font-bold text-white/38">{loading ? 'กำลังค้นหา...' : searched ? `พบ ${total || items.length} เรื่อง${hasMore ? ' ขึ้นไป' : ''}` : 'กำลังเตรียมรายการแนะนำ'}</p>
        </div>

        {error ? <div className="mb-3 rounded-2xl bg-[#e50914]/12 px-4 py-3 text-xs font-bold text-red-100">{error}</div> : null}

        {loading ? (
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-6 md:gap-4 lg:grid-cols-7 xl:grid-cols-8">
            {Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-[2/3] animate-pulse rounded-lg bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" />)}
          </div>
        ) : items.length ? (
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-6 md:gap-4 lg:grid-cols-7 xl:grid-cols-8">
            {items.map((item, index) => <MovieCard key={`search-page-${item.mediaType}-${item.id}-${index}`} item={item} grid priority={index < 4} priorityBadge={activeTitle || undefined} />)}
          </div>
        ) : searched ? (
          <div className="rounded-[24px] bg-white/[0.045] p-6 text-center text-sm font-bold text-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">ไม่พบหนังที่ตรงกับเงื่อนไขนี้</div>
        ) : (
          <div className="rounded-[24px] bg-white/[0.045] p-6 text-center text-sm font-bold leading-6 text-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">กำลังเตรียมรายการแนะนำ</div>
        )}

        <div ref={loadMoreRef} className="min-h-8 py-5 text-center">
          {loadingMore ? <span className="text-xs font-black text-white/38">กำลังโหลดเพิ่ม...</span> : searched && hasMore ? <span className="text-xs font-black text-white/30">เลื่อนลงเพื่อโหลดเพิ่ม</span> : searched && items.length ? <span className="text-xs font-black text-white/25">แสดงครบแล้ว</span> : null}
        </div>
      </section>
    </main>
  );
}
