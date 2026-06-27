'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { adminSessionHeaders } from '@/lib/admin-session-browser';

type Media = 'movie' | 'tv';
type Status = 'draft' | 'review' | 'published' | 'broken' | 'hidden';
type Item = {
  tmdb_id: number;
  media_type: Media;
  title?: string | null;
  title_th?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  notes?: string | null;
  section_slug?: string;
  status?: Status;
  poster_url?: string | null;
  backdrop_url?: string | null;
  rating?: number;
  year?: string;
  release_date?: string | null;
  month?: string;
  language?: string;
  runtime?: number | null;
  genres?: string[];
  source_bucket?: string;
  source_buckets?: string[];
  updated_at?: string;
};

type FilterOptions = {
  sources: string[];
  sections: string[];
  genres: string[];
  years: string[];
  months: string[];
  languages: string[];
  providers: string[];
  statuses: string[];
  media: string[];
  posters: string[];
};

type Payload = { ok: boolean; links?: Item[]; options?: FilterOptions; meta?: { hasMore?: boolean; matched?: number; returned?: number; total?: number }; error?: string };
type Form = {
  tmdb_id: string;
  media_type: Media;
  title: string;
  title_th: string;
  watch_url: string;
  trailer_url: string;
  section_slug: string;
  status: Status;
  provider: string;
  notes: string;
};

type FilterPreset = {
  label: string;
  q?: string;
  status?: string;
  source?: string;
  media?: string;
  sort?: string;
  poster?: string;
  genre?: string;
  year?: string;
  month?: string;
  language?: string;
  provider?: string;
  section?: string;
  minRating?: string;
  maxRating?: string;
  view?: string;
};

const sections = ['watch-ready', 'top-rated', 'popular', 'now-playing', 'series', 'thai', 'action', 'horror', 'comedy', 'korea', 'japan', 'china', 'documentary'];
const cls = 'rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#e50914]';
const limit = 240;

const emptyOptions: FilterOptions = {
  sources: ['all'],
  sections: ['all'],
  genres: ['all'],
  years: ['all'],
  months: ['all'],
  languages: ['all'],
  providers: ['all'],
  statuses: ['all', 'missing', 'ready', 'draft', 'review', 'published', 'broken', 'hidden', 'no-trailer', 'has-trailer'],
  media: ['all', 'movie', 'tv'],
  posters: ['with-poster', 'all', 'no-poster'],
};

const presets: FilterPreset[] = [
  { label: 'ทั้งหมด', status: 'all', source: 'all', media: 'all', poster: 'with-poster', genre: 'all', year: 'all', month: 'all', language: 'all', provider: 'all', section: 'all', view: 'unique' },
  { label: 'ยังไม่มีลิงก์', status: 'missing' },
  { label: 'พร้อมดู', status: 'ready' },
  { label: 'หนัง', media: 'movie' },
  { label: 'ซีรีส์', media: 'tv' },
  { label: 'ไม่มี Trailer', status: 'no-trailer' },
  { label: 'ลิงก์เสีย', status: 'broken' },
  { label: 'ซ่อนอยู่', status: 'hidden' },
  { label: 'คะแนนสูง', sort: 'rating', genre: 'คะแนนสูง', minRating: '8' },
  { label: 'หนังใหม่', sort: 'newest', genre: 'หนังใหม่' },
  { label: 'ไม่มีโปสเตอร์', poster: 'no-poster' },
  { label: 'ดูทุกแถว Sync', view: 'rows', poster: 'all' },
];

const monthLabels: Record<string, string> = {
  all: 'ทุกเดือน',
  '01': 'มกราคม',
  '02': 'กุมภาพันธ์',
  '03': 'มีนาคม',
  '04': 'เมษายน',
  '05': 'พฤษภาคม',
  '06': 'มิถุนายน',
  '07': 'กรกฎาคม',
  '08': 'สิงหาคม',
  '09': 'กันยายน',
  '10': 'ตุลาคม',
  '11': 'พฤศจิกายน',
  '12': 'ธันวาคม',
};

function optionLabel(value: string, type?: string) {
  if (value === 'all') return 'ทั้งหมด';
  if (type === 'media') {
    if (value === 'movie') return 'ภาพยนตร์';
    if (value === 'tv') return 'ซีรีส์';
  }
  if (type === 'poster') {
    if (value === 'with-poster') return 'มีโปสเตอร์';
    if (value === 'no-poster') return 'ไม่มีโปสเตอร์';
  }
  if (type === 'month') return monthLabels[value] || value;
  if (type === 'status') {
    const labels: Record<string, string> = {
      missing: 'ยังไม่มีลิงก์',
      ready: 'พร้อมดู',
      draft: 'draft',
      review: 'draft/review',
      published: 'published',
      broken: 'broken',
      hidden: 'hidden',
      'no-trailer': 'ไม่มี Trailer',
      'has-trailer': 'มี Trailer',
    };
    return labels[value] || value;
  }
  return value;
}

function name(item: Item) {
  return item.title_th || item.title || `TMDB ${item.tmdb_id}`;
}

function toForm(item: Item): Form {
  return {
    tmdb_id: String(item.tmdb_id),
    media_type: item.media_type,
    title: item.title || '',
    title_th: item.title_th || item.title || '',
    watch_url: item.watch_url || '',
    trailer_url: item.trailer_url || '',
    section_slug: item.section_slug || 'watch-ready',
    status: item.watch_url ? 'published' : item.status || 'draft',
    provider: item.provider || 'bunny',
    notes: item.notes || '',
  };
}

function statusLabel(item: Item) {
  if (item.watch_url) return 'พร้อมดู';
  if (item.status === 'broken') return 'ลิงก์เสีย';
  if (item.status === 'hidden') return 'ซ่อน';
  if (item.status === 'review') return 'รอตรวจ';
  return 'ไม่มีลิงก์';
}

function Edit({
  item,
  form,
  setForm,
  onClose,
  onSave,
  saving,
}: {
  item: Item;
  form: Form;
  setForm: (form: Form) => void;
  onClose: () => void;
  onSave: (event: FormEvent) => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/80 p-4 text-white backdrop-blur-xl">
      <form onSubmit={onSave} className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#060606] p-5 shadow-[0_28px_120px_rgba(0,0,0,0.78)]">
        <div className="flex gap-4">
          <img src={item.poster_url || ''} alt={name(item)} className="h-40 w-28 rounded-xl bg-white/10 object-cover" />
          <div className="flex-1">
            <p className="text-xs font-black text-[#e50914]">EDIT MOVIE</p>
            <h2 className="mt-2 text-3xl font-black leading-tight">{form.title_th || form.title || name(item)}</h2>
            <p className="mt-2 text-xs text-white/50">TMDB {item.tmdb_id} • {item.media_type} • ★ {Number(item.rating || 0).toFixed(1)} • {item.year || '-'}</p>
            <p className="mt-1 text-xs text-white/36">{item.genres?.join(' / ') || item.section_slug || '-'}</p>
            <p className="mt-1 text-xs text-white/30">Bucket: {item.source_buckets?.join(' / ') || item.source_bucket || '-'}</p>
          </div>
          <button type="button" onClick={onClose} className="h-10 w-10 rounded-full bg-white/10 text-xl">×</button>
        </div>

        <div className="mt-5 grid gap-3">
          <label className="grid gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/36">Watch URL / Embed URL / HLS URL</span>
            <input value={form.watch_url} onChange={(event) => setForm({ ...form, watch_url: event.target.value, status: event.target.value.trim() ? 'published' : form.status })} placeholder="ลิงก์รับชม" className={cls} />
          </label>
          <input value={form.trailer_url} onChange={(event) => setForm({ ...form, trailer_url: event.target.value })} placeholder="Trailer URL" className={cls} />
          <div className="grid gap-3 md:grid-cols-2">
            <input value={form.title_th} onChange={(event) => setForm({ ...form, title_th: event.target.value })} placeholder="ชื่อไทย" className={cls} />
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="ชื่ออังกฤษ" className={cls} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <select value={form.section_slug} onChange={(event) => setForm({ ...form, section_slug: event.target.value })} className={cls}>
              {sections.map((section) => <option key={section} value={section}>{section}</option>)}
            </select>
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Status })} className={cls}>
              <option value="draft">draft</option>
              <option value="review">review</option>
              <option value="published">published</option>
              <option value="broken">broken</option>
              <option value="hidden">hidden</option>
            </select>
            <input value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} placeholder="provider เช่น bunny / iframe / hls" className={cls} />
          </div>
          <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="หมายเหตุ / server / source / key" className={cls} />
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <a href={form.watch_url || '#'} target="_blank" rel="noreferrer" className={`rounded-xl bg-white/10 px-4 py-2 text-sm ${form.watch_url ? '' : 'pointer-events-none opacity-40'}`}>เปิด Preview</a>
          <button type="button" onClick={() => setForm({ ...form, watch_url: '', status: 'draft' })} className="rounded-xl bg-white/10 px-4 py-2 text-sm">ล้างลิงก์</button>
          <button type="button" onClick={onClose} className="rounded-xl bg-white/10 px-4 py-2 text-sm">ยกเลิก</button>
          <button disabled={saving} className="rounded-xl bg-[#e50914] px-5 py-2 text-sm font-black disabled:opacity-50">{saving ? 'กำลังบันทึก' : 'บันทึก'}</button>
        </div>
      </form>
    </div>
  );
}

export function AdminCatalogTable() {
  const [q, setQ] = useState('');
  const [source, setSource] = useState('all');
  const [media, setMedia] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('rating');
  const [poster, setPoster] = useState('with-poster');
  const [genre, setGenre] = useState('all');
  const [year, setYear] = useState('all');
  const [month, setMonth] = useState('all');
  const [language, setLanguage] = useState('all');
  const [provider, setProvider] = useState('all');
  const [section, setSection] = useState('all');
  const [minRating, setMinRating] = useState('');
  const [maxRating, setMaxRating] = useState('');
  const [view, setView] = useState('unique');
  const [options, setOptions] = useState<FilterOptions>(emptyOptions);
  const [items, setItems] = useState<Item[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [matched, setMatched] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [active, setActive] = useState<Item | null>(null);
  const [form, setForm] = useState<Form | null>(null);

  function currentFilters(overrides: Partial<FilterPreset> = {}) {
    return {
      q,
      source,
      media,
      status,
      sort,
      poster,
      genre,
      year,
      month,
      language,
      provider,
      section,
      minRating,
      maxRating,
      view,
      ...overrides,
    };
  }

  const activeFilters = useMemo(() => [
    source !== 'all' ? `Bucket ${source}` : null,
    genre !== 'all' ? `หมวด ${genre}` : null,
    media !== 'all' ? optionLabel(media, 'media') : null,
    status !== 'all' ? `สถานะ ${optionLabel(status, 'status')}` : null,
    year !== 'all' ? `ปี ${year}` : null,
    month !== 'all' ? `เดือน ${optionLabel(month, 'month')}` : null,
    language !== 'all' ? `ภาษา ${language}` : null,
    provider !== 'all' ? `Provider ${provider}` : null,
    section !== 'all' ? `Section ${section}` : null,
    poster !== 'with-poster' ? optionLabel(poster, 'poster') : null,
    minRating ? `คะแนน ≥ ${minRating}` : null,
    maxRating ? `คะแนน ≤ ${maxRating}` : null,
    view === 'rows' ? 'ดูทุกแถว sync' : 'unique movie',
    q.trim() ? `คำค้น “${q.trim()}”` : null,
  ].filter(Boolean), [genre, language, maxRating, media, minRating, month, poster, provider, q, section, source, status, view, year]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildParams(nextOffset = 0, overrides: Partial<FilterPreset> = {}) {
    const values = currentFilters(overrides);
    return new URLSearchParams({
      q: values.q || '',
      source: values.source || 'all',
      media: values.media || 'all',
      status: values.status || 'all',
      sort: values.sort || 'rating',
      poster: values.poster || 'with-poster',
      genre: values.genre || 'all',
      year: values.year || 'all',
      month: values.month || 'all',
      language: values.language || 'all',
      provider: values.provider || 'all',
      section: values.section || 'all',
      minRating: values.minRating || '',
      maxRating: values.maxRating || '',
      view: values.view || 'unique',
      limit: String(limit),
      offset: String(nextOffset),
    });
  }

  async function load(nextOffset = 0, append = false, overrides: Partial<FilterPreset> = {}) {
    setLoading(true);
    setErr('');
    setMsg('');

    try {
      const response = await fetch(`/api/admin/catalog-lite?${buildParams(nextOffset, overrides)}`, {
        headers: adminSessionHeaders(),
        cache: 'no-store',
      });
      const data = (await response.json()) as Payload;
      if (!response.ok || !data.ok) throw new Error(data.error || 'โหลดไม่สำเร็จ');

      const next = data.links || [];
      setItems((old) => (append ? [...old, ...next] : next));
      setOffset(nextOffset + next.length);
      setHasMore(Boolean(data.meta?.hasMore));
      setMatched(typeof data.meta?.matched === 'number' ? data.meta.matched : null);
      setTotal(typeof data.meta?.total === 'number' ? data.meta.total : null);
      if (data.options) setOptions(data.options);
      setMsg(`โหลด ${next.length} รายการ${typeof data.meta?.matched === 'number' ? ` จาก ${data.meta.matched} รายการที่ตรงเงื่อนไข` : ''}`);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'โหลดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;

    setSaving(true);
    setErr('');
    try {
      const response = await fetch('/api/admin/movie-links', {
        method: 'POST',
        headers: adminSessionHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({ ...form, tmdb_id: Number(form.tmdb_id) }),
      });
      const data = (await response.json()) as Payload;
      if (!response.ok || !data.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');

      setMsg('บันทึกแล้ว');
      setActive(null);
      setForm(null);
      await load(0, false);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  async function exportCatalog(exportMode: 'filtered' | 'all') {
    setExporting(true);
    setErr('');
    setMsg('');

    try {
      const params = buildParams(0);
      params.set('limit', '50000');
      params.set('exportMode', exportMode);
      const response = await fetch(`/api/admin/export-missing-links?${params}`, {
        headers: adminSessionHeaders(),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error((await response.text()) || 'Export ไม่สำเร็จ');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `dofree-catalog-${exportMode}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMsg(exportMode === 'all' ? 'Export รายละเอียดทั้งหมดแล้ว' : 'Export รายละเอียดตามตัวกรองแล้ว');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Export ไม่สำเร็จ');
    } finally {
      setExporting(false);
    }
  }

  function open(item: Item) {
    setActive(item);
    setForm(toForm(item));
  }

  function applyPreset(preset: FilterPreset) {
    if (preset.source) setSource(preset.source);
    if (preset.status) setStatus(preset.status);
    if (preset.media) setMedia(preset.media);
    if (preset.sort) setSort(preset.sort);
    if (preset.poster) setPoster(preset.poster);
    if (preset.genre) setGenre(preset.genre);
    if (preset.year) setYear(preset.year);
    if (preset.month) setMonth(preset.month);
    if (preset.language) setLanguage(preset.language);
    if (preset.provider) setProvider(preset.provider);
    if (preset.section) setSection(preset.section);
    if (preset.minRating !== undefined) setMinRating(preset.minRating);
    if (preset.maxRating !== undefined) setMaxRating(preset.maxRating);
    if (preset.view) setView(preset.view);
    void load(0, false, preset);
  }

  function clearFilters() {
    const reset = { source: 'all', media: 'all', status: 'all', sort: 'rating', poster: 'with-poster', genre: 'all', year: 'all', month: 'all', language: 'all', provider: 'all', section: 'all', minRating: '', maxRating: '', view: 'unique' };
    setQ('');
    setSource(reset.source);
    setMedia(reset.media);
    setStatus(reset.status);
    setSort(reset.sort);
    setPoster(reset.poster);
    setGenre(reset.genre);
    setYear(reset.year);
    setMonth(reset.month);
    setLanguage(reset.language);
    setProvider(reset.provider);
    setSection(reset.section);
    setMinRating(reset.minRating);
    setMaxRating(reset.maxRating);
    setView(reset.view);
    void load(0, false, { ...reset, q: '' });
  }

  return (
    <section className="min-h-screen bg-[#030303] p-4 text-white md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a href="/" className="text-xs text-red-200/70">← กลับหน้าแรก</a>
        <div className="flex flex-wrap gap-2">
          <a href="/admin" className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white/70">Dashboard</a>
          <a href="/admin/users" className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white/70">Users</a>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">Admin Workflow</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.07em] md:text-6xl">Admin Catalog</h1>
          <p className="mt-2 text-sm font-semibold text-white/42">กรองละเอียดจากข้อมูลทั้งหมด: หมวดหน้าแรก, bucket, ปี, เดือน, ภาษา, provider, status, rating และ export รายละเอียดครบ</p>
        </div>
        <button type="button" onClick={clearFilters} className="rounded-xl bg-white/[0.08] px-4 py-2 text-sm font-black text-white/70">รีเซ็ตตัวกรอง</button>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); void load(0, false); }} className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <div className="grid gap-2 md:grid-cols-[1.4fr_140px_140px_140px_140px]">
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="ค้นหาหนัง / ซีรีส์ / TMDB ID / ปี / ภาษา / หมายเหตุ" className={cls} />
          <select value={genre} onChange={(event) => setGenre(event.target.value)} className={cls}>{options.genres.map((item) => <option key={item} value={item}>{optionLabel(item)}</option>)}</select>
          <select value={source} onChange={(event) => setSource(event.target.value)} className={cls}>{options.sources.map((item) => <option key={item} value={item}>{optionLabel(item)}</option>)}</select>
          <select value={year} onChange={(event) => setYear(event.target.value)} className={cls}>{options.years.map((item) => <option key={item} value={item}>{item === 'all' ? 'ทุกปี' : item}</option>)}</select>
          <select value={month} onChange={(event) => setMonth(event.target.value)} className={cls}>{options.months.map((item) => <option key={item} value={item}>{optionLabel(item, 'month')}</option>)}</select>
        </div>

        <div className="mt-2 grid gap-2 md:grid-cols-[120px_140px_140px_140px_140px_140px_120px_120px]">
          <select value={media} onChange={(event) => setMedia(event.target.value)} className={cls}>{options.media.map((item) => <option key={item} value={item}>{optionLabel(item, 'media')}</option>)}</select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={cls}>{options.statuses.map((item) => <option key={item} value={item}>{optionLabel(item, 'status')}</option>)}</select>
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className={cls}>{options.languages.map((item) => <option key={item} value={item}>{item === 'all' ? 'ทุกภาษา' : item}</option>)}</select>
          <select value={provider} onChange={(event) => setProvider(event.target.value)} className={cls}>{options.providers.map((item) => <option key={item} value={item}>{item === 'all' ? 'ทุก provider' : item}</option>)}</select>
          <select value={section} onChange={(event) => setSection(event.target.value)} className={cls}>{options.sections.map((item) => <option key={item} value={item}>{item === 'all' ? 'ทุก section' : item}</option>)}</select>
          <select value={poster} onChange={(event) => setPoster(event.target.value)} className={cls}>{options.posters.map((item) => <option key={item} value={item}>{optionLabel(item, 'poster')}</option>)}</select>
          <input value={minRating} onChange={(event) => setMinRating(event.target.value)} placeholder="คะแนนต่ำสุด" className={cls} inputMode="decimal" />
          <input value={maxRating} onChange={(event) => setMaxRating(event.target.value)} placeholder="คะแนนสูงสุด" className={cls} inputMode="decimal" />
        </div>

        <div className="mt-2 grid gap-2 md:grid-cols-[160px_160px_1fr_auto_auto_auto]">
          <select value={sort} onChange={(event) => setSort(event.target.value)} className={cls}>
            <option value="rating">คะแนนสูง</option>
            <option value="newest">หนังใหม่</option>
            <option value="oldest">เก่าสุด</option>
            <option value="popular">ยอดนิยม</option>
            <option value="updated">อัปเดตล่าสุด</option>
            <option value="title">เรียงชื่อ</option>
          </select>
          <select value={view} onChange={(event) => setView(event.target.value)} className={cls}>
            <option value="unique">Unique movie</option>
            <option value="rows">ทุกแถว sync</option>
          </select>
          <div className="hidden md:block" />
          <button type="submit" disabled={loading} className="rounded-xl bg-[#e50914] px-4 py-2 font-black disabled:opacity-50">{loading ? 'โหลด' : 'ค้นหา'}</button>
          <button type="button" onClick={() => exportCatalog('filtered')} disabled={exporting} className="rounded-xl bg-white/[0.10] px-4 py-2 font-black text-white disabled:opacity-50">{exporting ? 'Export...' : 'Export ตามกรอง'}</button>
          <button type="button" onClick={() => exportCatalog('all')} disabled={exporting} className="rounded-xl bg-[#f4c46b] px-4 py-2 font-black text-black disabled:opacity-50">Export ทั้งหมด</button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button key={preset.label} type="button" onClick={() => applyPreset(preset)} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-black text-white/66 hover:bg-white/[0.12] hover:text-white">
            {preset.label}
          </button>
        ))}
      </div>

      {activeFilters.length ? <p className="mt-3 text-xs font-bold text-white/38">ตัวกรอง: {activeFilters.join(' • ')}</p> : null}
      {msg ? <p className="mt-3 rounded-xl bg-green-400/10 p-2 text-sm text-green-100">{msg}</p> : null}
      {err ? <p className="mt-3 rounded-xl bg-red-500/10 p-2 text-sm text-red-100">{err}</p> : null}

      <div className="mt-5 flex items-center justify-between text-xs font-black text-white/42">
        <span>แสดง {items.length} รายการ{typeof matched === 'number' ? ` / ตรงเงื่อนไข ${matched} รายการ` : ''}{typeof total === 'number' ? ` / ทั้งหมด ${total}` : ''}</span>
        <span>คลิกการ์ดเพื่อแก้ลิงก์</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
        {items.map((item, index) => (
          <button key={`${item.media_type}-${item.tmdb_id}-${item.source_bucket || index}`} type="button" onClick={() => open(item)} className="group text-left">
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/5 transition group-hover:-translate-y-1 group-hover:ring-[#e50914]/60">
              {item.poster_url ? <img src={item.poster_url} alt={name(item)} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center p-3 text-center text-xs font-black text-white/30">NO POSTER</div>}
              <span className={`absolute left-2 top-2 rounded-md px-2 py-1 text-[9px] font-black ${item.watch_url ? 'bg-emerald-500 text-black' : item.status === 'broken' ? 'bg-orange-500 text-black' : 'bg-[#e50914] text-white'}`}>{statusLabel(item)}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-black">{name(item)}</p>
            <p className="text-xs text-white/50">★ {Number(item.rating || 0).toFixed(1)} • {item.year || '-'}{item.month ? `/${item.month}` : ''} • {item.media_type}</p>
            <p className="line-clamp-1 text-[10px] font-bold text-white/30">{item.genres?.slice(0, 2).join(' / ') || item.source_bucket || '-'}</p>
          </button>
        ))}
      </div>

      {!loading && !items.length ? (
        <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center text-sm font-black text-white/50">
          ไม่พบรายการตามเงื่อนไขนี้ ลองรีเซ็ตตัวกรองหรือค้นด้วย TMDB ID
        </div>
      ) : null}

      {hasMore ? (
        <div className="mt-6 text-center">
          <button type="button" onClick={() => load(offset, true)} className="rounded-xl bg-white/10 px-6 py-3 text-sm font-black">โหลดเพิ่ม {limit}</button>
        </div>
      ) : null}

      {active && form ? <Edit item={active} form={form} setForm={setForm} onClose={() => { setActive(null); setForm(null); }} onSave={save} saving={saving} /> : null}
    </section>
  );
}
