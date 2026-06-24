'use client';

import { useEffect, useState } from 'react';

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
  rating?: number;
  year?: string;
  language?: string;
  genres?: string[];
};

type Payload = {
  ok: boolean;
  links?: AdminMovieLink[];
  meta?: { hasMore?: boolean; returned?: number };
  error?: string;
};

const sources = [
  ['all', 'ทุกหมวด'], ['top-rated', 'คะแนนสูง'], ['popular', 'ยอดนิยม'], ['now-playing', 'มาใหม่'],
  ['series', 'ซีรีส์'], ['thai', 'หนังไทย'], ['action', 'แอ็กชัน'], ['horror', 'สยองขวัญ'],
  ['comedy', 'คอมเมดี้'], ['korea', 'เกาหลี'], ['japan', 'ญี่ปุ่น'], ['china', 'จีน'], ['documentary', 'สารคดี'],
];

function cleanToken(value: string) {
  return value.trim().replace(/^DOFREE_ADMIN_TOKEN\s*=\s*/i, '').trim();
}

function titleOf(item: AdminMovieLink) {
  return item.title_th || item.title || `TMDB ${item.tmdb_id}`;
}

function fieldClass() {
  return 'h-11 rounded-2xl bg-white/[0.075] px-4 text-sm font-bold text-white outline-none ring-1 ring-white/[0.06] placeholder:text-white/30 focus:ring-[#e50914]/60';
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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    if (!clean) {
      setError('ใส่ Admin Token ก่อน');
      return;
    }
    window.localStorage.setItem('dofree_admin_token', clean);
    setToken(clean);
    setLoading(true);
    setError(null);
    setMessage(null);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  async function saveWatchUrl(item: AdminMovieLink) {
    const watchUrl = window.prompt(`วางลิงก์รับชมสำหรับ ${titleOf(item)}`, item.watch_url || '');
    if (watchUrl === null) return;
    const section = window.prompt('ลงหมวดไหน เช่น now-playing, popular, top-rated, action, horror', item.section_slug || source || 'watch-ready') || item.section_slug || 'watch-ready';
    const clean = cleanToken(token);
    try {
      const res = await fetch('/api/admin/movie-links', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-admin-token': clean },
        body: JSON.stringify({
          tmdb_id: item.tmdb_id,
          media_type: item.media_type,
          title: item.title,
          title_th: item.title_th || item.title,
          watch_url: watchUrl.trim(),
          section_slug: section.trim(),
          status: watchUrl.trim() ? 'published' : 'draft',
          provider: 'admin',
        }),
      });
      const data = (await res.json()) as Payload;
      if (!res.ok || !data.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      setMessage('บันทึกลิงก์แล้ว');
      await load({ nextOffset: 0, append: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    }
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
            <button key={`${item.media_type}-${item.tmdb_id}`} type="button" onClick={() => saveWatchUrl(item)} className="group relative aspect-[2/3] overflow-hidden rounded-[10px] bg-[#111] text-left shadow-[0_18px_54px_rgba(0,0,0,0.58)] transition hover:-translate-y-1 hover:shadow-glow">
              {item.poster_url ? <img src={item.poster_url} alt={titleOf(item)} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110" /> : null}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),transparent_42%,rgba(0,0,0,0.96))]" />
              <div className="absolute left-2 top-2 flex flex-wrap gap-1"><span className={`${item.watch_url ? 'bg-[#e50914] text-white' : 'bg-[#f4c46b] text-black'} rounded px-1.5 py-0.5 text-[8px] font-black`}>{item.watch_url ? 'พร้อมดู' : 'ไม่มีลิงก์'}</span><span className="rounded bg-black/54 px-1.5 py-0.5 text-[8px] font-black text-white">★ {Number(item.rating || 0).toFixed(1)}</span></div>
              <div className="absolute inset-x-0 bottom-0 p-2.5"><p className="text-[8px] font-black uppercase tracking-[0.13em] text-white/42">{item.media_type === 'tv' ? 'Series' : 'Movie'} • {item.section_slug}</p><h3 className="mt-1 line-clamp-2 text-[11px] font-black leading-tight text-white md:text-sm">{titleOf(item)}</h3><p className="mt-1 text-[10px] font-bold text-white/54">{item.year || 'ไม่ระบุ'} • {item.language || '-'}</p></div>
            </button>
          ))}
        </div>

        {hasMore ? <div className="text-center"><button onClick={() => load({ nextOffset: offset, append: true })} disabled={loading} className="h-12 rounded-2xl bg-white/[0.08] px-8 text-xs font-black text-white/70">โหลดหน้าถัดไปอีก {limit} เรื่อง</button></div> : null}
      </section>
    </main>
  );
}
