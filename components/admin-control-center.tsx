'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminSessionHeaders } from '@/lib/admin-session-browser';

type Category = { slug: string; title_th: string; subtitle_th?: string | null; enabled: boolean; autoplay?: boolean; sort_order: number; updated_at?: string };
type Card = { tmdb_id: number; media_type: 'movie' | 'tv'; title: string; title_en?: string | null; poster_url?: string | null; rating?: number | string | null; release_year?: string | null; source_bucket?: string | null; sort_score?: number | string | null; is_active: boolean };

type CategoryPayload = { ok?: boolean; categories?: Category[]; error?: string };
type CardPayload = { ok?: boolean; cards?: Card[]; error?: string };

const input = 'rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-bold text-white outline-none placeholder:text-white/32 focus:border-[#e50914]';

export function AdminControlCenter() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [q, setQ] = useState('');
  const [bucket, setBucket] = useState('all');
  const [active, setActive] = useState('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const categoryOptions = useMemo(() => categories.filter((item) => item.slug), [categories]);

  async function loadCategories() {
    const response = await fetch('/api/admin/categories', { headers: adminSessionHeaders(), cache: 'no-store' });
    const payload = (await response.json()) as CategoryPayload;
    if (payload.ok) setCategories(payload.categories || []);
    else setMessage(payload.error || 'โหลดหมวดไม่สำเร็จ');
  }

  async function seedCategories() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/categories', { method: 'POST', headers: adminSessionHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ seed: true }) });
      const payload = (await response.json()) as CategoryPayload;
      if (!payload.ok) throw new Error(payload.error || 'seed ไม่สำเร็จ');
      setCategories(payload.categories || []);
      setMessage('สร้าง/เติมค่า default categories แล้ว');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'seed ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  async function loadCards() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '80');
      if (q.trim()) params.set('q', q.trim());
      if (bucket !== 'all') params.set('bucket', bucket);
      if (active !== 'all') params.set('active', active);
      const response = await fetch(`/api/admin/cards?${params.toString()}`, { headers: adminSessionHeaders(), cache: 'no-store' });
      const payload = (await response.json()) as CardPayload;
      if (!payload.ok) throw new Error(payload.error || 'โหลดการ์ดไม่สำเร็จ');
      setCards(payload.cards || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดการ์ดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  async function patchCategory(slug: string, patch: Partial<Category>) {
    const previous = categories;
    setCategories((current) => current.map((item) => item.slug === slug ? { ...item, ...patch } : item));
    try {
      const response = await fetch('/api/admin/categories', { method: 'PATCH', headers: adminSessionHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ slug, ...patch }) });
      const payload = await response.json() as { ok?: boolean; error?: string };
      if (!payload.ok) throw new Error(payload.error || 'บันทึกหมวดไม่สำเร็จ');
      setMessage('บันทึกหมวดแล้ว');
    } catch (error) {
      setCategories(previous);
      setMessage(error instanceof Error ? error.message : 'บันทึกหมวดไม่สำเร็จ');
    }
  }

  async function patchCard(card: Card, patch: Partial<Card>) {
    const key = `${card.media_type}-${card.tmdb_id}`;
    const previous = cards;
    setCards((current) => current.map((item) => `${item.media_type}-${item.tmdb_id}` === key ? { ...item, ...patch } : item));
    try {
      const response = await fetch('/api/admin/cards', { method: 'PATCH', headers: adminSessionHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ tmdb_id: card.tmdb_id, media_type: card.media_type, ...patch }) });
      const payload = await response.json() as { ok?: boolean; error?: string };
      if (!payload.ok) throw new Error(payload.error || 'บันทึกการ์ดไม่สำเร็จ');
      setMessage('บันทึกการ์ดแล้ว');
    } catch (error) {
      setCards(previous);
      setMessage(error instanceof Error ? error.message : 'บันทึกการ์ดไม่สำเร็จ');
    }
  }

  useEffect(() => {
    void loadCategories();
    void loadCards();
  }, []);

  return (
    <section id="admin-control-center" className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
      <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_28px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e50914]">Control Center</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] md:text-4xl">ควบคุมหน้าเว็บ / หมวด / การ์ด</h2>
            <p className="mt-1 text-xs font-semibold text-white/42">เปิดปิดหมวด ตั้งชื่อหมวด จัดลำดับ และเปิดปิดการ์ดหนังจากหน้าเดียว</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={seedCategories} disabled={loading} className="rounded-2xl bg-white/[0.08] px-4 py-2 text-xs font-black text-white/75 hover:bg-white/[0.14] disabled:opacity-50">เติมหมวด default</button>
            <button onClick={() => { void loadCategories(); void loadCards(); }} disabled={loading} className="rounded-2xl bg-[#e50914] px-4 py-2 text-xs font-black text-white shadow-glow disabled:opacity-50">Refresh</button>
          </div>
        </div>

        {message ? <div className="mt-4 rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-xs font-bold text-white/70">{message}</div> : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.3fr]">
          <div className="rounded-[24px] border border-white/10 bg-black/35 p-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-black">หมวดหมู่หน้าแรก</h3><span className="text-[10px] font-black text-white/35">{categories.length} หมวด</span></div>
            <div className="grid max-h-[680px] gap-3 overflow-y-auto pr-1">
              {categories.map((cat) => (
                <article key={cat.slug} className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#e50914]/80">{cat.slug}</p><p className="text-xs font-bold text-white/38">แสดงบนหน้าเว็บ: {cat.enabled ? 'เปิด' : 'ปิด'}</p></div>
                    <button onClick={() => void patchCategory(cat.slug, { enabled: !cat.enabled })} className={`rounded-xl px-3 py-2 text-[10px] font-black ${cat.enabled ? 'bg-emerald-400/15 text-emerald-100' : 'bg-white/[0.08] text-white/45'}`}>{cat.enabled ? 'ON' : 'OFF'}</button>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <input className={input} value={cat.title_th} onChange={(event) => setCategories((current) => current.map((item) => item.slug === cat.slug ? { ...item, title_th: event.target.value } : item))} onBlur={(event) => void patchCategory(cat.slug, { title_th: event.target.value })} placeholder="ชื่อหมวด" />
                    <input className={input} value={cat.subtitle_th || ''} onChange={(event) => setCategories((current) => current.map((item) => item.slug === cat.slug ? { ...item, subtitle_th: event.target.value } : item))} onBlur={(event) => void patchCategory(cat.slug, { subtitle_th: event.target.value })} placeholder="คำอธิบายหมวด" />
                    <input className={input} type="number" value={cat.sort_order} onChange={(event) => setCategories((current) => current.map((item) => item.slug === cat.slug ? { ...item, sort_order: Number(event.target.value) } : item))} onBlur={(event) => void patchCategory(cat.slug, { sort_order: Number(event.target.value) })} placeholder="ลำดับ" />
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/35 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-black">การ์ดหนัง / ซีรีส์</h3><span className="text-[10px] font-black text-white/35">{cards.length} รายการ</span></div>
            <div className="mb-4 grid gap-2 md:grid-cols-[1fr_160px_130px_auto]">
              <input className={input} value={q} onChange={(event) => setQ(event.target.value)} placeholder="ค้นหาชื่อหนัง" />
              <select className={input} value={bucket} onChange={(event) => setBucket(event.target.value)}><option value="all">ทุกหมวด</option>{categoryOptions.map((cat) => <option key={cat.slug} value={cat.slug}>{cat.title_th}</option>)}</select>
              <select className={input} value={active} onChange={(event) => setActive(event.target.value)}><option value="all">ทุกสถานะ</option><option value="true">เปิดอยู่</option><option value="false">ปิดอยู่</option></select>
              <button onClick={() => void loadCards()} disabled={loading} className="rounded-xl bg-white/[0.08] px-4 py-2 text-xs font-black text-white/75 hover:bg-white/[0.14] disabled:opacity-50">ค้นหา</button>
            </div>
            <div className="grid max-h-[680px] gap-3 overflow-y-auto pr-1">
              {cards.map((card) => (
                <article key={`${card.media_type}-${card.tmdb_id}`} className="grid gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3 md:grid-cols-[56px_1fr]">
                  <div className="h-[82px] w-14 overflow-hidden rounded-lg bg-white/[0.06]">{card.poster_url ? <img src={card.poster_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-black text-white/90">{card.title_en || card.title}</p><p className="mt-1 text-[10px] font-bold text-white/38">{card.media_type} · TMDB {card.tmdb_id} · ★ {Number(card.rating || 0).toFixed(1)} · {card.release_year || '-'}</p></div><button onClick={() => void patchCard(card, { is_active: !card.is_active })} className={`rounded-xl px-3 py-2 text-[10px] font-black ${card.is_active ? 'bg-emerald-400/15 text-emerald-100' : 'bg-white/[0.08] text-white/45'}`}>{card.is_active ? 'แสดง' : 'ซ่อน'}</button></div>
                    <div className="mt-3 grid gap-2 md:grid-cols-[1fr_130px]">
                      <select className={input} value={card.source_bucket || ''} onChange={(event) => void patchCard(card, { source_bucket: event.target.value })}><option value="">ไม่ระบุหมวด</option>{categoryOptions.map((cat) => <option key={cat.slug} value={cat.slug}>{cat.title_th}</option>)}</select>
                      <input className={input} type="number" value={String(card.sort_score || 0)} onChange={(event) => setCards((current) => current.map((item) => item.tmdb_id === card.tmdb_id && item.media_type === card.media_type ? { ...item, sort_score: Number(event.target.value) } : item))} onBlur={(event) => void patchCard(card, { sort_score: Number(event.target.value) })} placeholder="ลำดับ" />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
