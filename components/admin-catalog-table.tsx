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
  language?: string;
  genres?: string[];
  updated_at?: string;
};
type Payload = { ok: boolean; links?: Item[]; meta?: { hasMore?: boolean; matched?: number; returned?: number }; error?: string };
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
  status?: string;
  source?: string;
  media?: string;
  sort?: string;
  poster?: string;
};

const sections = ['watch-ready', 'top-rated', 'popular', 'now-playing', 'series', 'thai', 'action', 'horror', 'comedy', 'korea', 'japan', 'china', 'documentary'];
const sources = ['all', 'watch-ready', 'top-rated', 'popular', 'now-playing', 'series', 'thai', 'action', 'horror', 'comedy', 'korea', 'japan', 'china', 'documentary'];
const cls = 'rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#e50914]';
const limit = 240;

const presets: FilterPreset[] = [
  { label: 'ทั้งหมด', status: 'all', source: 'all', media: 'all', poster: 'with-poster' },
  { label: 'ยังไม่มีลิงก์', status: 'missing' },
  { label: 'พร้อมดู', status: 'ready' },
  { label: 'หนัง', media: 'movie' },
  { label: 'ซีรีส์', media: 'tv' },
  { label: 'ไม่มี Trailer', status: 'no-trailer' },
  { label: 'ลิงก์เสีย', status: 'broken' },
  { label: 'ซ่อนอยู่', status: 'hidden' },
  { label: 'คะแนนสูง', sort: 'rating' },
  { label: 'หนังใหม่', sort: 'newest' },
  { label: 'ไม่มีโปสเตอร์', poster: 'no-poster' },
];

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
  const [items, setItems] = useState<Item[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [matched, setMatched] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [active, setActive] = useState<Item | null>(null);
  const [form, setForm] = useState<Form | null>(null);

  const activeFilters = useMemo(() => [
    source !== 'all' ? `หมวด ${source}` : null,
    media !== 'all' ? (media === 'movie' ? 'ภาพยนตร์' : 'ซีรีส์') : null,
    status !== 'all' ? `สถานะ ${status}` : null,
    poster !== 'with-poster' ? 'ไม่มีโปสเตอร์' : null,
    q.trim() ? `คำค้น “${q.trim()}”` : null,
  ].filter(Boolean), [media, poster, q, source, status]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(nextOffset = 0, append = false) {
    setLoading(true);
    setErr('');
    setMsg('');

    try {
      const params = new URLSearchParams({ q, source, media, status, sort, poster, limit: String(limit), offset: String(nextOffset) });
      const response = await fetch(`/api/admin/catalog-lite?${params}`, {
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

  async function exportMissing() {
    setExporting(true);
    setErr('');
    setMsg('');

    try {
      const params = new URLSearchParams({ source, media, q, limit: '10000' });
      const response = await fetch(`/api/admin/export-missing-links?${params}`, {
        headers: adminSessionHeaders(),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error((await response.text()) || 'Export ไม่สำเร็จ');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `dofree-missing-links-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMsg('Export CSV แล้ว เปิดด้วย Excel ได้');
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
    window.setTimeout(() => void load(0, false), 0);
  }

  function clearFilters() {
    setQ('');
    setSource('all');
    setMedia('all');
    setStatus('all');
    setSort('rating');
    setPoster('with-poster');
    window.setTimeout(() => void load(0, false), 0);
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
          <p className="mt-2 text-sm font-semibold text-white/42">ค้นหาได้จากชื่อไทย/อังกฤษ, TMDB ID, ปี, ภาษา, หมวด, provider, notes และสถานะลิงก์</p>
        </div>
        <button type="button" onClick={clearFilters} className="rounded-xl bg-white/[0.08] px-4 py-2 text-sm font-black text-white/70">รีเซ็ตตัวกรอง</button>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); void load(0, false); }} className="mt-6 grid gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:grid-cols-[1.5fr_150px_135px_150px_145px_135px_auto_auto]">
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="ค้นหาหนัง / ซีรีส์ / TMDB ID / ปี / ภาษา / หมายเหตุ" className={cls} />
        <select value={source} onChange={(event) => setSource(event.target.value)} className={cls}>
          {sources.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={media} onChange={(event) => setMedia(event.target.value)} className={cls}>
          <option value="all">หนัง+ซีรีส์</option>
          <option value="movie">ภาพยนตร์</option>
          <option value="tv">ซีรีส์</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className={cls}>
          <option value="all">ทุกสถานะ</option>
          <option value="missing">ยังไม่มีลิงก์</option>
          <option value="ready">พร้อมดู</option>
          <option value="draft">draft</option>
          <option value="review">draft/review</option>
          <option value="published">published</option>
          <option value="broken">broken</option>
          <option value="hidden">hidden</option>
          <option value="no-trailer">ไม่มี Trailer</option>
          <option value="has-trailer">มี Trailer</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} className={cls}>
          <option value="rating">คะแนนสูง</option>
          <option value="newest">หนังใหม่</option>
          <option value="oldest">เก่าสุด</option>
          <option value="popular">ยอดนิยม</option>
          <option value="updated">อัปเดตล่าสุด</option>
        </select>
        <select value={poster} onChange={(event) => setPoster(event.target.value)} className={cls}>
          <option value="with-poster">มีโปสเตอร์</option>
          <option value="no-poster">ไม่มีโปสเตอร์</option>
          <option value="all">โปสเตอร์ทั้งหมด</option>
        </select>
        <button type="submit" disabled={loading} className="rounded-xl bg-[#e50914] px-4 py-2 font-black disabled:opacity-50">{loading ? 'โหลด' : 'ค้นหา'}</button>
        <button type="button" onClick={exportMissing} disabled={exporting} className="rounded-xl bg-[#f4c46b] px-4 py-2 font-black text-black disabled:opacity-50">{exporting ? 'Export...' : 'Export Excel'}</button>
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
        <span>แสดง {items.length} รายการ{typeof matched === 'number' ? ` / ตรงเงื่อนไข ${matched} รายการ` : ''}</span>
        <span>คลิกการ์ดเพื่อแก้ลิงก์</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
        {items.map((item) => (
          <button key={`${item.media_type}-${item.tmdb_id}`} type="button" onClick={() => open(item)} className="group text-left">
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/5 transition group-hover:-translate-y-1 group-hover:ring-[#e50914]/60">
              {item.poster_url ? <img src={item.poster_url} alt={name(item)} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center p-3 text-center text-xs font-black text-white/30">NO POSTER</div>}
              <span className={`absolute left-2 top-2 rounded-md px-2 py-1 text-[9px] font-black ${item.watch_url ? 'bg-emerald-500 text-black' : item.status === 'broken' ? 'bg-orange-500 text-black' : 'bg-[#e50914] text-white'}`}>{statusLabel(item)}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-black">{name(item)}</p>
            <p className="text-xs text-white/50">★ {Number(item.rating || 0).toFixed(1)} • {item.year || '-'} • {item.media_type}</p>
            <p className="line-clamp-1 text-[10px] font-bold text-white/30">{item.section_slug || item.genres?.[0] || '-'}</p>
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
