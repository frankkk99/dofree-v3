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

const SEARCH_LIMIT = 24;
const defaultFilters: FilterState = {
  category: '',
  type: '',
  country: '',
  language: '',
  quality: '',
  year: '',
  sort: 'rating-desc',
};

const selectClass = 'h-11 w-full min-w-0 appearance-none truncate rounded-[16px] bg-white/[0.085] px-3 pr-7 text-[11px] font-black text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl focus:ring-2 focus:ring-[#e50914]/50';

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

export function SearchPageClient({ initialQuery = '', initialFilters }: SearchPageClientProps) {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<FilterState>(() => normalizeInitialFilters(initialFilters));
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

  const categoryOptions = useMemo(() => [{ value: '', label: 'ทุกหมวด' }, ...categories.map((category) => ({ value: category.slug, label: category.title }))], [categories]);
  const activeTitle = useMemo(() => categories.find((category) => category.slug === filters.category)?.title || '', [filters.category, categories]);
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
    const hasInitialFilter = Boolean(initialQuery.trim()) || Object.entries(normalizeInitialFilters(initialFilters)).some(([key, value]) => key !== 'sort' && Boolean(value));
    if (hasInitialFilter) void runSearch(initialQuery, normalizeInitialFilters(initialFilters), false, 0);
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

  function loadMore() {
    if (!searched || loading || loadingMore || !hasMore) return;
    void runSearch(query, filters, true, offset);
  }

  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <section className="sticky top-0 z-30 max-h-[50dvh] overflow-y-auto border-b border-white/10 bg-[#050505]/94 px-3 pb-3 pt-[calc(env(safe-area-inset-top)+14px)] shadow-[0_24px_80px_rgba(0,0,0,0.64)] backdrop-blur-2xl md:static md:max-h-none md:px-6 md:py-20 md:shadow-none">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <a href="/" className="text-xs font-black text-red-200/75 hover:text-red-100 md:text-sm">← กลับหน้าแรก</a>
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914] md:mt-8">Search</p>
              <h1 className="mt-1 text-[30px] font-black tracking-[-0.08em] md:text-7xl">ค้นหา</h1>
              <p className="mt-1 hidden max-w-2xl text-sm font-bold leading-6 text-white/45 md:block">ค้นหาหนัง ซีรีส์ และกรองด้วยหมวด ประเภท ประเทศ ภาษา ความชัด ปี และคะแนน</p>
            </div>
            <a href="/" aria-label="ปิดหน้าค้นหา" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/[0.08] text-2xl font-black text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[#e50914] hover:text-white">×</a>
          </div>

          <form
            onSubmit={(event) => { event.preventDefault(); void runSearch(query, filters, false, 0); }}
            className="mt-3 rounded-[24px] bg-black/46 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_22px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl md:mt-8 md:rounded-[26px] md:p-3"
          >
            <div className="flex h-12 items-center gap-2 rounded-[19px] bg-white/[0.07] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
              <span className="text-lg text-white/58">⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาหนัง ซีรีส์ หรือคำสำคัญ" className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/36" />
              {query ? <button type="button" onClick={() => setQuery('')} className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.10] text-sm text-white/75">×</button> : null}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:mt-3 md:grid-cols-[1.35fr_0.95fr_0.95fr_0.95fr_1fr_0.82fr_1.25fr] md:gap-2">
              <FilterSelect label="หมวดหมู่" value={filters.category} options={categoryOptions} onChange={(value) => updateFilter('category', value)} />
              <FilterSelect label="ประเภท" value={filters.type} options={typeOptions} onChange={(value) => updateFilter('type', value)} />
              <FilterSelect label="ประเทศ" value={filters.country} options={countryOptions} onChange={(value) => updateFilter('country', value)} />
              <FilterSelect label="ภาษา" value={filters.language} options={languageOptions} onChange={(value) => updateFilter('language', value)} />
              <FilterSelect label="ความชัด" value={filters.quality} options={qualityOptions} onChange={(value) => updateFilter('quality', value)} />
              <FilterSelect label="ปี" value={filters.year} options={yearOptions} onChange={(value) => updateFilter('year', value)} />
              <FilterSelect label="เรียงคะแนน" value={filters.sort} options={sortOptions} onChange={(value) => updateFilter('sort', value)} />
            </div>

            <div className="mt-2 flex gap-2 md:mt-3">
              <button type="submit" className="h-11 flex-1 rounded-[17px] bg-[#e50914] text-xs font-black text-white shadow-[0_18px_52px_rgba(229,9,20,0.38)]">ค้นหา</button>
              <button type="button" onClick={clearSearch} className="h-11 w-[84px] rounded-[17px] bg-white/[0.075] text-xs font-black text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/[0.12] hover:text-white">ล้าง</button>
            </div>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-3 py-5 md:px-6 md:py-10">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3 md:mb-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">ผลลัพธ์</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.04em] md:text-3xl">{filterSummary ? filterSummary : query.trim() ? `ค้นหา “${query.trim()}”` : 'ผลลัพธ์ทั้งหมด'}</h2>
          </div>
          <p className="text-[11px] font-bold text-white/38">{loading ? 'กำลังค้นหา...' : searched ? `พบ ${total || items.length} เรื่อง${hasMore ? ' ขึ้นไป' : ''}` : 'พิมพ์คำค้นหาหรือเลือกตัวกรองเพื่อเริ่มค้นหา'}</p>
        </div>

        {error ? <div className="mb-3 rounded-2xl bg-[#e50914]/12 px-4 py-3 text-xs font-bold text-red-100">{error}</div> : null}

        {loading ? (
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-6 md:gap-4 lg:grid-cols-7 xl:grid-cols-8">
            {Array.from({ length: 16 }).map((_, index) => <div key={index} className="aspect-[2/3] animate-pulse rounded-lg bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" />)}
          </div>
        ) : items.length ? (
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-6 md:gap-4 lg:grid-cols-7 xl:grid-cols-8">
            {items.map((item, index) => <MovieCard key={`search-page-${item.mediaType}-${item.id}-${index}`} item={item} grid priority={index < 4} priorityBadge={activeTitle || undefined} />)}
          </div>
        ) : searched ? (
          <div className="rounded-[24px] bg-white/[0.045] p-6 text-center text-sm font-bold text-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">ไม่พบหนังที่ตรงกับเงื่อนไขนี้</div>
        ) : (
          <div className="rounded-[24px] bg-white/[0.045] p-6 text-center text-sm font-bold leading-6 text-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">พิมพ์คำค้นหาหรือเลือกตัวกรองเพื่อเริ่มค้นหา</div>
        )}

        {loadingMore ? (
          <div className="mt-3 grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-6 md:gap-4 lg:grid-cols-7 xl:grid-cols-8">
            {Array.from({ length: 8 }).map((_, index) => <div key={`loading-more-${index}`} className="aspect-[2/3] animate-pulse rounded-lg bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" />)}
          </div>
        ) : null}

        {searched && hasMore && !loading ? (
          <div className="mt-5 text-center">
            <button type="button" onClick={loadMore} disabled={loadingMore} className="rounded-full bg-white/[0.09] px-5 py-3 text-xs font-black text-white/64 hover:bg-white/[0.14] hover:text-white disabled:opacity-45">
              {loadingMore ? 'กำลังโหลดเพิ่ม...' : 'โหลดเพิ่ม'}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
