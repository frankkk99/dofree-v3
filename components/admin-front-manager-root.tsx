'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminFrontManagerCard } from '@/components/admin-front-manager-card';
import { AdminFrontManagerPanel } from '@/components/admin-front-manager-panel';
import { AdminFrontManagerSearch } from '@/components/admin-front-manager-search';
import { adminFrontBatchSize, emptyFrontOptions, type AdminFrontItem, type AdminFrontOptions, type AdminFrontPayload } from '@/components/admin-front-manager-types';
import { adminSessionHeaders } from '@/lib/admin-session-browser';

type Filters = { q: string; media: string; status: string; source: string; poster: string; section: string };
type SummaryCounts = { total: number; ready: number; missing: number };
const initialFilters: Filters = { q: '', media: 'all', status: 'all', source: 'all', poster: 'with-poster', section: 'all' };

function itemKey(item: Pick<AdminFrontItem, 'media_type' | 'tmdb_id'>) {
  return `${item.media_type}-${item.tmdb_id}`;
}

function mergeOptions(options?: AdminFrontOptions): AdminFrontOptions {
  return {
    sources: options?.sources?.length ? options.sources : emptyFrontOptions.sources,
    sections: options?.sections?.length ? options.sections : emptyFrontOptions.sections,
    genres: options?.genres?.length ? options.genres : emptyFrontOptions.genres,
    years: options?.years?.length ? options.years : emptyFrontOptions.years,
    months: options?.months?.length ? options.months : emptyFrontOptions.months,
    languages: options?.languages?.length ? options.languages : emptyFrontOptions.languages,
    providers: options?.providers?.length ? options.providers : emptyFrontOptions.providers,
    statuses: options?.statuses?.length ? options.statuses : emptyFrontOptions.statuses,
    media: options?.media?.length ? options.media : emptyFrontOptions.media,
    posters: options?.posters?.length ? options.posters : emptyFrontOptions.posters,
  };
}

function catalogUrl(filters: Filters, offset: number, limit = adminFrontBatchSize) {
  const params = new URLSearchParams({
    q: filters.q,
    media: filters.media,
    status: filters.status,
    source: filters.source,
    poster: filters.poster,
    section: filters.section,
    provider: 'all',
    genre: 'all',
    year: 'all',
    month: 'all',
    language: 'all',
    sort: filters.q ? 'title' : 'rating',
    view: 'unique',
    limit: String(limit),
    offset: String(offset),
  });
  return `/api/admin/catalog-lite?${params.toString()}`;
}

function summaryUrl(status: string) {
  return catalogUrl({ ...initialFilters, status, poster: 'all' }, 0, 1);
}

function countFromPayload(payload: AdminFrontPayload) {
  return Number(payload.meta?.matched ?? payload.meta?.total ?? payload.links?.length ?? 0);
}

function formatCount(value: number) {
  return Number(value || 0).toLocaleString('th-TH');
}

export function AdminFrontManagerRoot() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [debouncedFilters, setDebouncedFilters] = useState<Filters>(initialFilters);
  const [items, setItems] = useState<AdminFrontItem[]>([]);
  const [options, setOptions] = useState<AdminFrontOptions>(emptyFrontOptions);
  const [summary, setSummary] = useState<SummaryCounts>({ total: 0, ready: 0, missing: 0 });
  const [selected, setSelected] = useState<AdminFrontItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedFilters(filters), 420);
    return () => window.clearTimeout(timer);
  }, [filters]);

  const loadSummary = useCallback(async () => {
    try {
      const headers = adminSessionHeaders();
      const [totalResponse, readyResponse, missingResponse] = await Promise.all([
        fetch(summaryUrl('all'), { headers, cache: 'no-store' }),
        fetch(summaryUrl('ready'), { headers, cache: 'no-store' }),
        fetch(summaryUrl('missing'), { headers, cache: 'no-store' }),
      ]);
      const [totalPayload, readyPayload, missingPayload] = await Promise.all([
        totalResponse.json() as Promise<AdminFrontPayload>,
        readyResponse.json() as Promise<AdminFrontPayload>,
        missingResponse.json() as Promise<AdminFrontPayload>,
      ]);
      setSummary({
        total: countFromPayload(totalPayload),
        ready: countFromPayload(readyPayload),
        missing: countFromPayload(missingPayload),
      });
    } catch {
      setSummary((current) => current);
    }
  }, []);

  const loadCatalog = useCallback(async (nextOffset: number, mode: 'replace' | 'append') => {
    setError('');
    if (mode === 'append') setLoadingMore(true);
    else setLoading(true);
    try {
      const response = await fetch(catalogUrl(debouncedFilters, nextOffset), { headers: adminSessionHeaders(), cache: 'no-store' });
      const payload = (await response.json()) as AdminFrontPayload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลดข้อมูลไม่สำเร็จ');
      const nextItems = payload.links || [];
      setItems((current) => (mode === 'append' ? [...current, ...nextItems] : nextItems));
      setOptions(mergeOptions(payload.options));
      setOffset(nextOffset + nextItems.length);
      setHasMore(Boolean(payload.meta?.hasMore));
      if (!summary.total && payload.meta?.total) setSummary((current) => ({ ...current, total: Number(payload.meta?.total || 0) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ');
      if (mode === 'replace') setItems([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedFilters, summary.total]);

  useEffect(() => { void loadSummary(); }, [loadSummary]);
  useEffect(() => { void loadCatalog(0, 'replace'); }, [loadCatalog]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasMore && !loading && !loadingMore) void loadCatalog(offset, 'append');
    }, { rootMargin: '720px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadCatalog, offset]);

  const handleSaved = (saved: AdminFrontItem) => {
    setItems((current) => current.map((item) => (itemKey(item) === itemKey(saved) ? { ...item, ...saved } : item)));
    setSelected((current) => current && itemKey(current) === itemKey(saved) ? { ...current, ...saved } : current);
    void loadSummary();
  };

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 text-white md:px-8">
      <div className="admin-floating-glass rounded-2xl border border-white/10 p-5 md:rounded-[24px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#e50914]">Admin Front Manager</p>
          <div className="flex flex-wrap gap-2">
            <a href="/" className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white/82 hover:bg-white/[0.14] hover:text-white">กลับหน้าแรก</a>
            <a href="/admin" className="rounded-xl bg-[#e50914] px-3 py-2 text-xs font-black text-white shadow-glow hover:bg-[#ff1722]">กลับหน้าแอดมิน</a>
          </div>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h1 className="text-3xl font-black tracking-[-0.05em] md:text-5xl">จัดการหน้าบ้าน</h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/72">โหมดแอดมินสำหรับดูการ์ดแบบหน้าบ้าน ค้นหา ตรวจลิงก์ จัดหมวดหมู่ และแก้สถานะ โดยไม่แตะ UI หน้าบ้านจริง</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
            <div className="rounded-2xl bg-white/[0.06] p-3"><span className="block text-xl text-white">{formatCount(summary.total || items.length)}</span><span className="text-white/45">Catalog ทั้งหมด</span></div>
            <div className="rounded-2xl bg-emerald-400/10 p-3"><span className="block text-xl text-emerald-100">{formatCount(summary.ready)}</span><span className="text-white/45">พร้อมดู</span></div>
            <div className="rounded-2xl bg-[#f4c46b]/10 p-3"><span className="block text-xl text-[#f4c46b]">{formatCount(summary.missing)}</span><span className="text-white/45">ไม่มีลิงก์</span></div>
          </div>
        </div>
      </div>

      <AdminFrontManagerSearch
        q={filters.q}
        media={filters.media}
        status={filters.status}
        source={filters.source}
        poster={filters.poster}
        section={filters.section}
        options={options}
        loading={loading || loadingMore}
        onQueryChange={(value) => setFilters((current) => ({ ...current, q: value }))}
        onMediaChange={(value) => setFilters((current) => ({ ...current, media: value }))}
        onStatusChange={(value) => setFilters((current) => ({ ...current, status: value }))}
        onSourceChange={(value) => setFilters((current) => ({ ...current, source: value }))}
        onPosterChange={(value) => setFilters((current) => ({ ...current, poster: value }))}
        onSectionChange={(value) => setFilters((current) => ({ ...current, section: value }))}
        onClear={() => setFilters(initialFilters)}
      />

      {error ? <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-bold text-red-100">{error}</div> : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {items.map((item) => <AdminFrontManagerCard key={`${item.media_type}-${item.tmdb_id}-${item.section_slug || item.source_bucket || 'item'}`} item={item} onSelect={setSelected} />)}
      </div>

      {loading && !items.length ? <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-sm font-black text-white/50">กำลังโหลดข้อมูล...</div> : null}
      {!loading && !items.length && !error ? <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-sm font-black text-white/50">ไม่พบข้อมูลตามตัวกรอง</div> : null}
      <div ref={sentinelRef} className="h-8" />
      {loadingMore ? <div className="pb-6 text-center text-xs font-black text-white/45">กำลังโหลดเพิ่ม...</div> : null}
      <AdminFrontManagerPanel item={selected} onClose={() => setSelected(null)} onSaved={handleSaved} />
    </section>
  );
}
