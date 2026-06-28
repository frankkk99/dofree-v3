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
  total?: number;
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

const SEARCH_LIMIT = 240;
const defaultFilters: FilterState = {
  category: '',
  type: '',
  country: '',
  language: '',
  quality: '',
  year: '',
  sort: 'rating-desc',
};

const selectClass = 'h-11 w-full min-w-0 appearance-none truncate rounded-[16px] bg-white/[0.085] px-3 pr-7 text-[11px] font-black text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl md:h-10 md:px-3 md:pr-7 md:text-xs';

const typeOptions = [
  { value: '', label: 'ทุกประเภท' },
  { value: 'movie', label: 'หนัง' },
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

function fallbackCategories(home: HomePayload): SearchCategory[] {
  return home.sections.map((section, index) => ({
    slug: section.slug,
    title: section.title,
    subtitle: section.eyebrow || section.description,
    sortOrder: index,
  }));
}

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

export function FloatingGlassSearch({ home }: { home: HomePayload }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [categories, setCategories] = useState<SearchCategory[]>(() => fallbackCategories(home));
  const [items, setItems] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    let cancelled = false;
    fetch('/api/categories', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload: CategoryPayload) => {
        if (!cancelled && payload.ok && Array.isArray(payload.categories) && payload.categories.length) setCategories(payload.categories);
      })
      .catch(() => null);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function runSearch(nextQuery = query, nextFilters = filters) {
    const cleanQuery = nextQuery.trim();
    setLoading(true);
    setSearched(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (cleanQuery) params.set('q', cleanQuery);
      if (nextFilters.category) params.set('category', nextFilters.category);
      if (nextFilters.type) params.set('type', nextFilters.type);
      if (nextFilters.country) params.set('country', nextFilters.country);
      if (nextFilters.language) params.set('language', nextFilters.language);
      if (nextFilters.quality) params.set('quality', nextFilters.quality);
      if (nextFilters.year) params.set('year', nextFilters.year);
      if (nextFilters.sort) params.set('sort', nextFilters.sort);
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

  function updateFilter(key: keyof FilterState, value: string) {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    void runSearch(query, nextFilters);
  }

  function clearSearch() {
    setQuery('');
    setFilters(defaultFilters);
    setItems([]);
    setSearched(false);
    setError('');
  }

  function openSearch() {
    setOpen(true);
    if (!searched) void runSearch(query, filters);
  }

  return (
    <>
      <button
        type="button"
        aria-label="เปิดค้นหา"
        onClick={openSearch}
        className="fixed bottom-5 right-4 z-[75] grid h-[58px] w-[58px] place-items-center rounded-[22px] bg-white/[0.085] text-white shadow-[0_22px_80px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-18px_42px_rgba(255,255,255,0.035)] backdrop-blur-2xl transition hover:scale-105 md:bottom-7 md:right-7"
      >
        <span className="absolute inset-0 rounded-[22px] bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.24),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))]" />
        <span className="relative grid h-10 w-10 place-items-center rounded-[16px] bg-black/28 text-[20px] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">⌕</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/50 px-2 py-3 text-white backdrop-blur-[5px] md:px-3 md:py-4">
          <div className="mx-auto max-w-6xl rounded-[28px] bg-black/62 p-2 shadow-[0_44px_140px_rgba(0,0,0,0.92),inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-38px_90px_rgba(255,255,255,0.035)] backdrop-blur-3xl md:rounded-[34px] md:p-5">
            <div className="rounded-[24px] bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-24px_70px_rgba(0,0,0,0.35)] md:rounded-[28px] md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#e50914]">Search</p>
                  <h2 className="mt-1 text-[28px] font-black leading-[0.95] tracking-[-0.06em] md:text-4xl">ค้นหาแบบละเอียด</h2>
                  <p className="mt-2 max-w-[260px] text-xs font-bold leading-5 text-white/42 md:max-w-none">กรองด้วยหมวด ประเภท ประเทศ ภาษา ความชัด ปี และคะแนน</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/[0.08] text-2xl font-black text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[#e50914] hover:text-white">×</button>
              </div>

              <form
                onSubmit={(event) => { event.preventDefault(); void runSearch(); }}
                className="mt-5 rounded-[24px] bg-black/46 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_22px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl md:rounded-[26px]"
              >
                <div className="flex h-12 items-center gap-2 rounded-[19px] bg-white/[0.07] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
                  <span className="text-lg text-white/58">⌕</span>
                  <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาหนัง ซีรีส์ หรือคำสำคัญ" className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/36" />
                  {query ? <button type="button" onClick={() => setQuery('')} className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.10] text-sm text-white/75">×</button> : null}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-[1.35fr_0.95fr_0.95fr_0.95fr_1fr_0.82fr_1.25fr] md:gap-2">
                  <FilterSelect label="หมวดหมู่" value={filters.category} options={categoryOptions} onChange={(value) => updateFilter('category', value)} />
                  <FilterSelect label="ประเภท" value={filters.type} options={typeOptions} onChange={(value) => updateFilter('type', value)} />
                  <FilterSelect label="ประเทศ" value={filters.country} options={countryOptions} onChange={(value) => updateFilter('country', value)} />
                  <FilterSelect label="ภาษา" value={filters.language} options={languageOptions} onChange={(value) => updateFilter('language', value)} />
                  <FilterSelect label="ความชัด" value={filters.quality} options={qualityOptions} onChange={(value) => updateFilter('quality', value)} />
                  <FilterSelect label="ปี" value={filters.year} options={yearOptions} onChange={(value) => updateFilter('year', value)} />
                  <FilterSelect label="เรียงคะแนน" value={filters.sort} options={sortOptions} onChange={(value) => updateFilter('sort', value)} />
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
                    <h3 className="mt-1 text-xl font-black tracking-[-0.04em]">{filterSummary ? filterSummary : query.trim() ? `ค้นหา “${query.trim()}”` : 'ผลลัพธ์ทั้งหมด'}</h3>
                  </div>
                  <p className="text-[11px] font-bold text-white/38">{loading ? 'กำลังค้นหา...' : searched ? `พบ ${items.length} เรื่อง` : 'เลือกตัวกรองหรือพิมพ์คำค้นหา'}</p>
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
