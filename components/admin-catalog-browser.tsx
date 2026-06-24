'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

type MediaType = 'movie' | 'tv';
type MovieStatus = 'draft' | 'review' | 'published' | 'broken' | 'hidden';

type AdminMovieLink = {
  id?: string;
  tmdb_id: number;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  notes?: string | null;
  section_slug?: string;
  status?: MovieStatus;
  poster_url?: string | null;
  backdrop_url?: string | null;
  rating?: number;
  year?: string;
  language?: string;
  genres?: string[];
};

type Payload = { ok: boolean; links?: AdminMovieLink[]; meta?: { hasMore?: boolean; returned?: number }; error?: string };

type EditorForm = {
  tmdb_id: string;
  media_type: MediaType;
  title: string;
  title_th: string;
  watch_url: string;
  trailer_url: string;
  section_slug: string;
  status: MovieStatus;
  provider: string;
  notes: string;
};

const sources = [
  ['all', 'ทุกหมวด'], ['top-rated', 'คะแนนสูง'], ['popular', 'ยอดนิยม'], ['now-playing', 'มาใหม่'],
  ['series', 'ซีรีส์'], ['thai', 'หนังไทย'], ['action', 'แอ็กชัน'], ['adventure', 'ผจญภัย'], ['animation', 'แอนิเมชัน'],
  ['drama', 'ดราม่า'], ['thriller', 'ระทึกขวัญ'], ['horror', 'สยองขวัญ'], ['comedy', 'คอมเมดี้'],
  ['sci-fi', 'ไซไฟ'], ['romance', 'โรแมนติก'], ['fantasy', 'แฟนตาซี'], ['crime', 'อาชญากรรม'],
  ['mystery', 'ลึกลับ'], ['korea', 'เกาหลี'], ['japan', 'ญี่ปุ่น'], ['china', 'จีน'], ['documentary', 'สารคดี'],
];

const publishSections = sources.filter(([value]) => value !== 'all');

function cleanToken(value: string) { return value.trim().replace(/^DOFREE_ADMIN_TOKEN\s*=\s*/i, '').trim(); }
function titleOf(item: AdminMovieLink) { return item.title_th || item.title || `TMDB ${item.tmdb_id}`; }
function fieldClass() { return 'h-11 rounded-2xl bg-white/[0.075] px-4 text-sm font-bold text-white outline-none ring-1 ring-white/[0.06] placeholder:text-white/30 focus:ring-[#e50914]/60'; }
function labelClass() { return 'text-xs font-black text-white/48'; }

function formFromItem(item: AdminMovieLink): EditorForm {
  return {
    tmdb_id: String(item.tmdb_id || ''),
    media_type: item.media_type || 'movie',
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

function EditorModal({ item, form, setForm, saving, onClose, onSubmit }: {
  item: AdminMovieLink;
  form: EditorForm;
  setForm: (form: EditorForm) => void;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/78 px-3 py-6 text-white backdrop-blur-2xl">
      <form onSubmit={onSubmit} className="mx-auto max-w-5xl overflow-hidden rounded-[34px] bg-[#050505] shadow-[0_44px_160px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.07]">
        <section className="relative p-4 md:p-6">
          {item.backdrop_url ? <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${item.backdrop_url})` }} /> : null}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(229,9,20,0.28),transparent_22rem),linear-gradient(180deg,rgba(0,0,0,0.2),#050505)]" />
          <button type="button" onClick={onClose} className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/52 text-2xl font-black text-white/70">×</button>
          <div className="relative z-10 flex gap-4">
            <div className="relative h-[180px] w-[120px] shrink-0 overflow-hidden rounded-[20px] bg-white/[0.06] shadow-2xl">
              {item.poster_url ? <img src={item.poster_url} alt={titleOf(item)} className="absolute inset-0 h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1 pr-12">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">Admin Movie Editor</p>
              <h2 className="mt-2 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-6xl">{form.title_th || form.title || titleOf(item)}</h2>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black text-white/64">
                <span className="rounded-full bg-white/[0.08] px-3 py-1">TMDB {item.tmdb_id}</span>
                <span className="rounded-full bg-white/[0.08] px-3 py-1">★ {Number(item.rating || 0).toFixed(1)}</span>
                <span className="rounded-full bg-white/[0.08] px-3 py-1">{item.year || 'ไม่ระบุ'}</span>
                <span className="rounded-full bg-white/[0.08] px-3 py-1">{item.media_type === 'tv' ? 'Series' : 'Movie'}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
          <label><span className={labelClass()}>TMDB ID</span><input value={form.tmdb_id} readOnly className={`${fieldClass()} mt-2 opacity-70`} /></label>
          <label><span className={labelClass()}>ประเภท</span><select value={form.media_type} onChange={(e) => setForm({ ...form, media_type: e.target.value as MediaType })} className={`${fieldClass()} mt-2`}><option value="movie">Movie</option><option value="tv">Series</option></select></label>
          <label><span className={labelClass()}>ชื่ออังกฤษ / ชื่อหลัก</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${fieldClass()} mt-2`} /></label>
          <label><span className={labelClass()}>ชื่อไทยที่โชว์บนเว็บ</span><input value={form.title_th} onChange={(e) => setForm({ ...form, title_th: e.target.value })} className={`${fieldClass()} mt-2`} /></label>
          <label className="md:col-span-2"><span className={labelClass()}>ลิงก์รับชม Bunny / Drive / MP4</span><input value={form.watch_url} onChange={(e) => setForm({ ...form, watch_url: e.target.value, status: e.target.value.trim() ? 'published' : form.status })} placeholder="https://player.mediadelivery.net/play/..." className={`${fieldClass()} mt-2`} /></label>
          <label className="md:col-span-2"><span className={labelClass()}>Trailer URL</span><input value={form.trailer_url} onChange={(e) => setForm({ ...form, trailer_url: e.target.value })} placeholder="YouTube / Bunny / Drive" className={`${fieldClass()} mt-2`} /></label>
          <label><span className={labelClass()}>หมวดที่จะลงหน้าเว็บ</span><select value={form.section_slug} onChange={(e) => setForm({ ...form, section_slug: e.target.value })} className={`${fieldClass()} mt-2`}><option value="watch-ready">Watch Ready</option>{publishSections.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label><span className={labelClass()}>สถานะ</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MovieStatus })} className={`${fieldClass()} mt-2`}><option value="draft">Draft / ยังไม่เผยแพร่</option><option value="review">Review / รอตรวจ</option><option value="published">Published / พร้อมดู</option><option value="broken">Broken / ลิงก์เสีย</option><option value="hidden">Hidden / ซ่อน</option></select></label>
          <label><span className={labelClass()}>Provider</span><input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className={`${fieldClass()} mt-2`} /></label>
          <label><span className={labelClass()}>หมายเหตุ</span><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="เช่น พากย์ไทย, ซับไทย, ไฟล์ยังไม่ชัด" className={`${fieldClass()} mt-2`} /></label>
        </section>

        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 bg-[#050505]/88 p-4 shadow-[0_-24px_90px_rgba(0,0,0,0.85)] backdrop-blur-2xl md:px-6">
          <button type="button" onClick={() => setForm({ ...form, watch_url: '', status: 'draft' })} className="h-11 rounded-2xl bg-white/[0.08] px-5 text-xs font-black text-white/62">ล้างลิงก์</button>
          <button type="button" onClick={onClose} className="h-11 rounded-2xl bg-white/[0.08] px-5 text-xs font-black text-white/62">ยกเลิก</button>
          <button disabled={saving} className="h-11 rounded-2xl bg-[#e50914] px-7 text-xs font-black text-white shadow-glow disabled:opacity-50">{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
        </div>
      </form>
    </div>
  );
}

export function AdminCatalogBrowser() {
  const [token, setToken] = useState('');
  const [items, setItems] = useState<AdminMovieLink[]>([]);
  const [q, setQ] = useState('');
  const [source, setSource] = useState('all');
  const [media, setMedia] = useState('all');
  const [status, setStatus] = useState('missing');
  const [sort, setSort] = useState('rating');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<AdminMovieLink | null>(null);
  const [editorForm, setEditorForm] = useState<EditorForm | null>(null);
  const limit = 240;

  useEffect(() => {
    const saved = window.localStorage.getItem('dofree_admin_token') || '';
    if (saved) {
      setToken(saved);
      void load({ nextOffset: 0, append: false, savedToken: saved });
    }
  }, []);

  async function load({ nextOffset = offset, append = false, savedToken = token } = {}) {
    const clean = cleanToken(savedToken);
    if (!clean) { setError('ใส่ Admin Token ก่อน'); return; }
    window.localStorage.setItem('dofree_admin_token', clean);
    setToken(clean);
    setLoading(true); setError(null); setMessage(null);
    try {
      const params = new URLSearchParams({ q, source, media, status, sort, limit: String(limit), offset: String(nextOffset) });
      const res = await fetch(`/api/admin/catalog-lite?${params.toString()}`, { headers: { 'x-admin-token': clean }, cache: 'no-store' });
      const data = (await res.json()) as Payload;
      if (!res.ok || !data.ok) throw new Error(data.error || 'โหลดข้อมูลไม่สำเร็จ');
      const next = data.links || [];
      setItems((old) => (append ? [...old, ...next] : next));
      setOffset(nextOffset + next.length);
      setHasMore(Boolean(data.meta?.hasMore));
      setMessage(`โหลด ${next.length} รายการ`);
    } catch (e) { setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ'); }
    finally { setLoading(false); }
  }

  function openEditor(item: AdminMovieLink) {
    setActiveItem(item);
    setEditorForm(formFromItem(item));
  }

  async function saveEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editorForm || !activeItem) return;
    const clean = cleanToken(token);
    setSaving(true); setError(null); setMessage(null);
    try {
      const res = await fetch('/api/admin/movie-links', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-admin-token': clean },
        body: JSON.stringify({ ...editorForm, tmdb_id: Number(editorForm.tmdb_id) }),
      });
      const data = (await res.json()) as Payload;
      if (!res.ok || !data.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      setMessage(`บันทึก ${editorForm.title_th || editorForm.title || activeItem.tmdb_id} แล้ว`);
      setActiveItem(null); setEditorForm(null);
      await load({ nextOffset: 0, append: false });
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'); }
    finally { setSaving(false); }
  }

  const ready = items.filter((item) => item.watch_url).length;

  return (
    <main className="min-h-screen bg-[#030303] pb-24 text-white">
      <section className="px-4 py-8 md:px-8">
        <a href="/" className="text-xs font-black text-red-200/70">← กลับหน้าแรก</a>
        <p className="mt-7 text-[10px] font-black uppercase tracking-[0.34em] text-[#e50914]">DOFree Admin Catalog</p>
        <h1 className="mt-3 max-w-5xl text-[38px] font-black leading-[0.9] tracking-[-0.08em] md:text-[72px]">ค้นหนังจาก Supabase Catalog</h1>
      </section>

      <section className="mx-auto max-w-[1600px] space-y-5 px-4 md:px-8">
        <div className="grid gap-2 rounded-[24px] bg-white/[0.035] p-3 ring-1 ring-white/[0.055] md:grid-cols-[1.25fr_1.25fr_0.8fr_0.7fr_0.75fr_0.75fr_auto] md:items-end">
          <input value={token} onChange={(e) => setToken(e.target.value)} type="password" placeholder="Admin Token" className={fieldClass()} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อหนัง" className={fieldClass()} />
          <select value={source} onChange={(e) => setSource(e.target.value)} className={fieldClass()}>{sources.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select value={media} onChange={(e) => setMedia(e.target.value)} className={fieldClass()}><option value="all">ทุกประเภท</option><option value="movie">หนัง</option><option value="tv">ซีรีส์</option></select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClass()}><option value="missing">ยังไม่มีลิงก์</option><option value="ready">พร้อมดู</option><option value="all">ทั้งหมด</option><option value="review">รอตรวจ</option></select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={fieldClass()}><option value="rating">คะแนนเยอะสุด</option><option value="newest">หนังใหม่ก่อน</option><option value="popular">ยอดนิยมก่อน</option></select>
          <button onClick={() => { setOffset(0); void load({ nextOffset: 0, append: false }); }} disabled={loading} className="h-11 rounded-2xl bg-[#e50914] px-5 text-xs font-black text-white shadow-glow disabled:opacity-45">{loading ? 'โหลด...' : 'ค้นหา'}</button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-black text-white/60">
          <span className="rounded-full bg-white/[0.08] px-4 py-2">แสดง {items.length} เรื่อง</span>
          <span className="rounded-full bg-white/[0.08] px-4 py-2">พร้อมดู {ready}</span>
          <span className="rounded-full bg-white/[0.08] px-4 py-2">ไม่มีลิงก์ {items.length - ready}</span>
          <a href="/admin/sync" className="rounded-full bg-[#e50914] px-4 py-2 text-white">ไปหน้า Sync</a>
        </div>

        {message ? <p className="rounded-xl bg-green-400/10 px-3 py-2 text-xs font-bold text-green-100">{message}</p> : null}
        {error ? <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100">{error}</p> : null}

        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 md:gap-4">
          {items.map((item) => (
            <button key={`${item.media_type}-${item.tmdb_id}`} type="button" onClick={() => openEditor(item)} className="group relative aspect-[2/3] overflow-hidden rounded-[10px] bg-[#111] text-left shadow-[0_18px_54px_rgba(0,0,0,0.58)] transition hover:-translate-y-1 hover:shadow-glow">
              {item.poster_url ? <img src={item.poster_url} alt={titleOf(item)} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110" /> : null}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),transparent_42%,rgba(0,0,0,0.96))]" />
              <div className="absolute left-2 top-2 flex flex-wrap gap-1"><span className={`${item.watch_url ? 'bg-[#e50914] text-white' : 'bg-[#f4c46b] text-black'} rounded px-1.5 py-0.5 text-[8px] font-black`}>{item.watch_url ? 'พร้อมดู' : 'ไม่มีลิงก์'}</span><span className="rounded bg-black/54 px-1.5 py-0.5 text-[8px] font-black text-white">★ {Number(item.rating || 0).toFixed(1)}</span></div>
              <div className="absolute inset-x-0 bottom-0 p-2.5"><p className="text-[8px] font-black uppercase tracking-[0.13em] text-white/42">{item.media_type === 'tv' ? 'Series' : 'Movie'} • {item.section_slug}</p><h3 className="mt-1 line-clamp-2 text-[11px] font-black leading-tight text-white md:text-sm">{titleOf(item)}</h3><p className="mt-1 text-[10px] font-bold text-white/54">{item.year || 'ไม่ระบุ'} • {item.language || '-'}</p></div>
            </button>
          ))}
        </div>

        {hasMore ? <div className="text-center"><button onClick={() => load({ nextOffset: offset, append: true })} disabled={loading} className="h-12 rounded-2xl bg-white/[0.08] px-8 text-xs font-black text-white/70">โหลดหน้าถัดไปอีก {limit} เรื่อง</button></div> : null}
      </section>

      {activeItem && editorForm ? <EditorModal item={activeItem} form={editorForm} setForm={setEditorForm} saving={saving} onClose={() => { setActiveItem(null); setEditorForm(null); }} onSubmit={saveEditor} /> : null}
    </main>
  );
}
