'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getStoredSession } from '@/lib/supabase-auth-browser';

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
  rating?: number;
  year?: string;
  language?: string;
};
type Payload = { ok: boolean; links?: Item[]; meta?: { hasMore?: boolean }; error?: string };
type Form = { tmdb_id: string; media_type: Media; title: string; title_th: string; watch_url: string; trailer_url: string; section_slug: string; status: Status; provider: string; notes: string };

const sections = ['watch-ready', 'top-rated', 'popular', 'now-playing', 'series', 'thai', 'action', 'horror', 'comedy', 'korea', 'japan', 'china', 'documentary'];
const sources = ['all', 'top-rated', 'popular', 'now-playing', 'series', 'thai', 'action', 'horror', 'comedy', 'korea', 'japan', 'china', 'documentary'];
const cls = 'rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/38';

function cleanToken(value: string) {
  return value.trim().replace(/^DOFREE_ADMIN_TOKEN\s*=\s*/i, '').trim();
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

function Edit({ item, form, setForm, onClose, onSave, saving }: { item: Item; form: Form; setForm: (form: Form) => void; onClose: () => void; onSave: (event: FormEvent) => void; saving: boolean }) {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/80 p-4 text-white">
      <form onSubmit={onSave} className="mx-auto max-w-2xl rounded-3xl bg-[#060606] p-5 ring-1 ring-white/10">
        <div className="flex gap-4">
          <img src={item.poster_url || ''} alt={name(item)} className="h-40 w-28 rounded-xl bg-white/10 object-cover" />
          <div className="flex-1">
            <p className="text-xs font-black text-[#e50914]">EDIT MOVIE</p>
            <h2 className="mt-2 text-3xl font-black">{form.title_th || form.title || name(item)}</h2>
            <p className="mt-2 text-xs text-white/50">TMDB {item.tmdb_id} • ★ {Number(item.rating || 0).toFixed(1)} • {item.year || '-'}</p>
          </div>
          <button type="button" onClick={onClose} className="h-10 w-10 rounded-full bg-white/10 text-xl">×</button>
        </div>

        <div className="mt-5 grid gap-3">
          <input value={form.watch_url} onChange={(event) => setForm({ ...form, watch_url: event.target.value, status: event.target.value.trim() ? 'published' : form.status })} placeholder="ลิงก์รับชม" className={cls} />
          <input value={form.trailer_url} onChange={(event) => setForm({ ...form, trailer_url: event.target.value })} placeholder="Trailer URL" className={cls} />
          <input value={form.title_th} onChange={(event) => setForm({ ...form, title_th: event.target.value })} placeholder="ชื่อไทย" className={cls} />
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="ชื่ออังกฤษ" className={cls} />
          <select value={form.section_slug} onChange={(event) => setForm({ ...form, section_slug: event.target.value })} className={cls}>{sections.map((section) => <option key={section} value={section}>{section}</option>)}</select>
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Status })} className={cls}>
            <option value="draft">draft</option>
            <option value="review">review</option>
            <option value="published">published</option>
            <option value="broken">broken</option>
            <option value="hidden">hidden</option>
          </select>
          <input value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} placeholder="provider" className={cls} />
          <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="หมายเหตุ" className={cls} />
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <a href={form.watch_url || '#'} target="_blank" className={`rounded-xl bg-white/10 px-4 py-2 text-sm ${form.watch_url ? '' : 'pointer-events-none opacity-40'}`}>เปิด Preview</a>
          <button type="button" onClick={() => setForm({ ...form, watch_url: '', status: 'draft' })} className="rounded-xl bg-white/10 px-4 py-2 text-sm">ล้างลิงก์</button>
          <button type="button" onClick={onClose} className="rounded-xl bg-white/10 px-4 py-2 text-sm">ยกเลิก</button>
          <button disabled={saving} className="rounded-xl bg-[#e50914] px-5 py-2 text-sm font-black">{saving ? 'กำลังบันทึก' : 'บันทึก'}</button>
        </div>
      </form>
    </div>
  );
}

export function AdminCatalogTable() {
  const [adminToken, setAdminToken] = useState('');
  const [q, setQ] = useState('');
  const [source, setSource] = useState('all');
  const [status, setStatus] = useState('missing');
  const [sort, setSort] = useState('rating');
  const [items, setItems] = useState<Item[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [active, setActive] = useState<Item | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const limit = 240;

  function authHeaders(tokenValue = adminToken, json = false): HeadersInit | null {
    const session = getStoredSession();
    if (session?.access_token) {
      return {
        ...(json ? { 'content-type': 'application/json' } : {}),
        Authorization: `Bearer ${session.access_token}`,
      };
    }

    const clean = cleanToken(tokenValue);
    if (!clean) return null;
    window.localStorage.setItem('dofree_admin_token', clean);
    setAdminToken(clean);
    return {
      ...(json ? { 'content-type': 'application/json' } : {}),
      'x-admin-token': clean,
    };
  }

  useEffect(() => {
    const saved = window.localStorage.getItem('dofree_admin_token') || '';
    if (saved) setAdminToken(saved);
    if (getStoredSession()?.access_token || saved) void load(0, false, saved);
  }, []);

  async function load(nextOffset = 0, append = false, tokenValue = adminToken) {
    const headers = authHeaders(tokenValue);
    if (!headers) {
      setErr('เข้าสู่ระบบแอดมิน หรือใส่ Admin Token ก่อน');
      return;
    }

    setLoading(true);
    setErr('');
    setMsg('');

    try {
      const params = new URLSearchParams({ q, source, media: 'all', status, sort, limit: String(limit), offset: String(nextOffset) });
      const response = await fetch(`/api/admin/catalog-lite?${params}`, { headers, cache: 'no-store' });
      const payload = (await response.json()) as Payload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลดไม่สำเร็จ');
      const next = payload.links || [];
      setItems((current) => append ? [...current, ...next] : next);
      setOffset(nextOffset + next.length);
      setHasMore(Boolean(payload.meta?.hasMore));
      setMsg(`โหลด ${next.length} รายการ`);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'โหลดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;

    const headers = authHeaders(adminToken, true);
    if (!headers) {
      setErr('เข้าสู่ระบบแอดมิน หรือใส่ Admin Token ก่อน');
      return;
    }

    setSaving(true);
    setErr('');

    try {
      const response = await fetch('/api/admin/movie-links', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...form, tmdb_id: Number(form.tmdb_id) }),
      });
      const payload = (await response.json()) as Payload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'บันทึกไม่สำเร็จ');
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
    const headers = authHeaders();
    if (!headers) {
      setErr('เข้าสู่ระบบแอดมิน หรือใส่ Admin Token ก่อน');
      return;
    }

    setExporting(true);
    setErr('');
    setMsg('');

    try {
      const params = new URLSearchParams({ source, media: 'all', q, limit: '10000' });
      const response = await fetch(`/api/admin/export-missing-links?${params}`, { headers, cache: 'no-store' });
      if (!response.ok) throw new Error(await response.text() || 'Export ไม่สำเร็จ');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dofree-missing-links-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
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

  return (
    <main className="min-h-screen bg-[#030303] p-4 text-white md:p-8">
      <a href="/" className="text-xs text-red-200/70">← กลับหน้าแรก</a>
      <h1 className="mt-6 text-4xl font-black md:text-6xl">Admin Catalog</h1>
      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/42">ล็อกอินแอดมินแล้วใช้งานได้ทันที ช่อง Admin Token เป็นทางสำรองสำหรับงานฉุกเฉินหรือ script import/export</p>

      <div className="mt-6 grid gap-2 rounded-2xl bg-white/[0.04] p-3 md:grid-cols-[1fr_1fr_160px_160px_160px_auto_auto]">
        <input type="password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} placeholder="Admin Token (optional)" className={cls} />
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="ค้นหาหนัง" className={cls} />
        <select value={source} onChange={(event) => setSource(event.target.value)} className={cls}>{sources.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className={cls}>
          <option value="missing">ยังไม่มีลิงก์</option>
          <option value="ready">พร้อมดู</option>
          <option value="all">ทั้งหมด</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} className={cls}>
          <option value="rating">คะแนนสูง</option>
          <option value="newest">หนังใหม่</option>
          <option value="popular">ยอดนิยม</option>
        </select>
        <button onClick={() => load(0, false)} disabled={loading} className="rounded-xl bg-[#e50914] px-4 py-2 font-black">{loading ? 'โหลด' : 'ค้นหา'}</button>
        <button onClick={exportMissing} disabled={exporting} className="rounded-xl bg-[#f4c46b] px-4 py-2 font-black text-black">{exporting ? 'Export...' : 'Export Excel'}</button>
      </div>

      {msg ? <p className="mt-3 rounded-xl bg-green-400/10 p-2 text-sm text-green-100">{msg}</p> : null}
      {err ? <p className="mt-3 rounded-xl bg-red-500/10 p-2 text-sm text-red-100">{err}</p> : null}

      <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
        {items.map((item) => (
          <button key={`${item.media_type}-${item.tmdb_id}`} onClick={() => open(item)} className="text-left">
            <div className="aspect-[2/3] overflow-hidden rounded-xl bg-white/10">{item.poster_url ? <img src={item.poster_url} alt={name(item)} className="h-full w-full object-cover" /> : null}</div>
            <p className="mt-2 line-clamp-2 text-xs font-black">{name(item)}</p>
            <p className="text-xs text-white/50">★ {Number(item.rating || 0).toFixed(1)} • {item.year || '-'} • {item.watch_url ? 'พร้อมดู' : 'ไม่มีลิงก์'}</p>
          </button>
        ))}
      </div>

      {hasMore ? <div className="mt-6 text-center"><button onClick={() => load(offset, true)} className="rounded-xl bg-white/10 px-6 py-3 text-sm font-black">โหลดเพิ่ม {limit}</button></div> : null}
      {active && form ? <Edit item={active} form={form} setForm={setForm} onClose={() => { setActive(null); setForm(null); }} onSave={save} saving={saving} /> : null}
    </main>
  );
}
