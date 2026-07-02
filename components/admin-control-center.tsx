// @ts-nocheck
'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminSeriesEpisodeEditor } from '@/components/admin-series-episode-editor';
import { adminSessionHeaders } from '@/lib/admin-session-browser';
import { adminInputClass, adminSelectClass } from '@/lib/admin-ui-classes';

type Category = {
  slug: string;
  title_th: string;
  subtitle_th?: string | null;
  enabled: boolean;
  autoplay?: boolean;
  sort_order: number;
  updated_at?: string;
  card_count?: number;
  visible_card_count?: number;
};

type Card = {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  title_en?: string | null;
  poster_url?: string | null;
  rating?: number | string | null;
  release_year?: string | null;
  source_bucket?: string | null;
  sort_score?: number | string | null;
  is_active: boolean;
};

type CategoryPayload = { ok?: boolean; categories?: Category[]; category?: Category; error?: string };
type CardPayload = { ok?: boolean; cards?: Card[]; card?: Card; error?: string };

const input = adminInputClass;
const selectInput = adminSelectClass;
const ghostBtn = 'rounded-xl bg-white/[0.08] px-3 py-2 text-[10px] font-black text-white/70 hover:bg-white/[0.14] disabled:opacity-45';
const redBtn = 'rounded-xl bg-[#e50914] px-3 py-2 text-[10px] font-black text-white shadow-glow disabled:opacity-45';

function cardKey(card: Pick<Card, 'media_type' | 'tmdb_id'>) {
  return `${card.media_type}-${card.tmdb_id}`;
}

function cardPayloadFromKey(key: string, patch: Partial<Card> = {}) {
  const [mediaType, id] = key.split('-');
  return { media_type: mediaType, tmdb_id: Number(id), ...patch };
}

function totalCards(category: Category) {
  return Number(category.card_count || 0);
}

function activeCards(category: Category) {
  return Number(category.visible_card_count ?? category.card_count ?? 0);
}

function displayCards(category: Category) {
  return category.enabled ? activeCards(category) : 0;
}

function categoryFilterLabel(value: string) {
  const labels: Record<string, string> = {
    all: 'ทุกหมวด',
    enabled: 'หมวดที่เปิดอยู่',
    disabled: 'หมวดที่ปิดอยู่',
    emptyVisible: 'ไม่มีการ์ดแสดง',
    hasVisible: 'มีการ์ดแสดง',
    emptyRaw: 'ไม่มีการ์ดในหมวด',
    autoplay: 'Auto Carousel เปิดอยู่',
  };
  return labels[value] || value;
}

export function AdminControlCenter() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [q, setQ] = useState('');
  const [bucket, setBucket] = useState('all');
  const [active, setActive] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [bulkBucket, setBulkBucket] = useState('');
  const [episodeEditorCard, setEpisodeEditorCard] = useState<Card | null>(null);

  const categoryOptions = useMemo(() => categories.filter((item) => item.slug), [categories]);
  const filteredCategories = useMemo(() => categories.filter((category) => {
    if (categoryFilter === 'enabled') return category.enabled;
    if (categoryFilter === 'disabled') return !category.enabled;
    if (categoryFilter === 'emptyVisible') return displayCards(category) === 0;
    if (categoryFilter === 'hasVisible') return displayCards(category) > 0;
    if (categoryFilter === 'emptyRaw') return totalCards(category) === 0;
    if (categoryFilter === 'autoplay') return Boolean(category.autoplay);
    return true;
  }), [categories, categoryFilter]);
  const stats = useMemo(() => ({
    emptyVisible: categories.filter((category) => displayCards(category) === 0).length,
    hasVisible: categories.filter((category) => displayCards(category) > 0).length,
    disabled: categories.filter((category) => !category.enabled).length,
    autoplay: categories.filter((category) => Boolean(category.autoplay)).length,
  }), [categories]);

  async function loadCategories() {
    const response = await fetch('/api/admin/categories', { headers: adminSessionHeaders(), cache: 'no-store' });
    const payload = (await response.json()) as CategoryPayload;
    if (payload.ok) setCategories(payload.categories || []);
    else setMessage(payload.error || 'โหลดหมวดไม่สำเร็จ');
  }

  async function loadCards(nextBucket = bucket) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '120');
      if (q.trim()) params.set('q', q.trim());
      if (nextBucket !== 'all') params.set('bucket', nextBucket);
      if (active !== 'all') params.set('active', active);
      const response = await fetch(`/api/admin/cards?${params.toString()}`, { headers: adminSessionHeaders(), cache: 'no-store' });
      const payload = (await response.json()) as CardPayload;
      if (!payload.ok) throw new Error(payload.error || 'โหลดการ์ดไม่สำเร็จ');
      setCards(payload.cards || []);
      setSelectedCards([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดการ์ดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll() {
    await Promise.all([loadCategories(), loadCards()]);
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

  async function patchCategory(slug: string, patch: Partial<Category>) {
    const previous = categories;
    setCategories((current) => current.map((item) => item.slug === slug ? { ...item, ...patch } : item));
    try {
      const response = await fetch('/api/admin/categories', { method: 'PATCH', headers: adminSessionHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ slug, ...patch }) });
      const payload = await response.json() as CategoryPayload;
      if (!payload.ok) throw new Error(payload.error || 'บันทึกหมวดไม่สำเร็จ');
      setMessage('บันทึกหมวดแล้ว');
      await loadCategories();
    } catch (error) {
      setCategories(previous);
      setMessage(error instanceof Error ? error.message : 'บันทึกหมวดไม่สำเร็จ');
    }
  }

  async function bulkPatchCategories(patch: Partial<Category>, label: string) {
    if (!selectedCategories.length) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/categories', { method: 'PATCH', headers: adminSessionHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ slugs: selectedCategories, ...patch }) });
      const payload = await response.json() as CategoryPayload;
      if (!payload.ok) throw new Error(payload.error || 'บันทึกหมวดไม่สำเร็จ');
      setMessage(`${label}หมวดที่เลือกแล้ว`);
      setSelectedCategories([]);
      await loadCategories();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกหมวดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  async function patchCard(card: Card, patch: Partial<Card>) {
    const key = cardKey(card);
    const previous = cards;
    setCards((current) => current.map((item) => cardKey(item) === key ? { ...item, ...patch } : item));
    try {
      const response = await fetch('/api/admin/cards', { method: 'PATCH', headers: adminSessionHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ tmdb_id: card.tmdb_id, media_type: card.media_type, ...patch }) });
      const payload = await response.json() as CardPayload;
      if (!payload.ok) throw new Error(payload.error || 'บันทึกการ์ดไม่สำเร็จ');
      setMessage('บันทึกการ์ดแล้ว');
      if (patch.source_bucket !== undefined || patch.is_active !== undefined) await loadCategories();
    } catch (error) {
      setCards(previous);
      setMessage(error instanceof Error ? error.message : 'บันทึกการ์ดไม่สำเร็จ');
    }
  }

  async function bulkPatchCards(patch: Partial<Card>) {
    if (!selectedCards.length) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/cards', { method: 'PATCH', headers: adminSessionHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ cards: selectedCards.map((key) => cardPayloadFromKey(key, patch)) }) });
      const payload = await response.json() as CardPayload;
      if (!payload.ok) throw new Error(payload.error || 'บันทึกการ์ดไม่สำเร็จ');
      setMessage('บันทึกการ์ดที่เลือกแล้ว');
      setSelectedCards([]);
      await refreshAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกการ์ดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  return (
    <section id="admin-control-center" className="mx-auto w-full max-w-7xl px-4 py-5 md:px-8 md:py-8">
      <div className="admin-floating-glass rounded-2xl border border-white/8 p-3 md:rounded-[28px] md:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.04em] md:text-3xl">Homepage</h2>
            <p className="mt-1 text-xs font-semibold text-white/42">Hero, หมวดหน้าแรก และการ์ดในแต่ละหมวด</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={seedCategories} disabled={loading} className={ghostBtn}>เติมหมวด default</button>
            <button onClick={() => void refreshAll()} disabled={loading} className={redBtn}>Refresh</button>
          </div>
        </div>

        {message ? <div className="mt-4 rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-xs font-bold text-white/70">{message}</div> : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.3fr]">
          <div className="rounded-2xl border border-white/8 bg-black/35 p-3 md:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div><h3 className="text-lg font-black">หมวดหมู่หน้าแรก</h3><p className="text-[10px] font-black text-white/35">{filteredCategories.length} / {categories.length} หมวด · เลือก {selectedCategories.length}</p></div>
              <div className="flex flex-wrap gap-1.5"><button className={ghostBtn} onClick={() => setSelectedCategories(filteredCategories.map((cat) => cat.slug))}>เลือกตามตัวกรอง</button><button className={ghostBtn} onClick={() => setSelectedCategories([])}>ไม่เลือกทั้งหมด</button></div>
            </div>
            <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto]">
              <select className={selectInput} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                {['all', 'enabled', 'disabled', 'autoplay', 'emptyVisible', 'hasVisible', 'emptyRaw'].map((value) => <option key={value} value={value}>{categoryFilterLabel(value)}</option>)}
              </select>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black text-white/42"><span className="rounded-xl bg-white/[0.06] px-2.5 py-2">ไม่มีการ์ดแสดง {stats.emptyVisible}</span><span className="rounded-xl bg-white/[0.06] px-2.5 py-2">มีการ์ดแสดง {stats.hasVisible}</span><span className="rounded-xl bg-white/[0.06] px-2.5 py-2">ปิดอยู่ {stats.disabled}</span><span className="rounded-xl bg-white/[0.06] px-2.5 py-2">Auto {stats.autoplay}</span></div>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5"><button className={ghostBtn} disabled={!selectedCategories.length || loading} onClick={() => void bulkPatchCategories({ enabled: true }, 'เปิด')}>เปิดที่เลือก</button><button className={ghostBtn} disabled={!selectedCategories.length || loading} onClick={() => void bulkPatchCategories({ enabled: false }, 'ปิด')}>ปิดที่เลือก</button><button className={ghostBtn} disabled={!selectedCategories.length || loading} onClick={() => void bulkPatchCategories({ autoplay: true }, 'เปิด Auto Carousel ')}>เปิด Auto ที่เลือก</button><button className={ghostBtn} disabled={!selectedCategories.length || loading} onClick={() => void bulkPatchCategories({ autoplay: false }, 'ปิด Auto Carousel ')}>ปิด Auto ที่เลือก</button></div>
            <div className="grid max-h-[680px] gap-3 overflow-y-auto pr-1">
              {filteredCategories.map((cat) => {
                const selected = selectedCategories.includes(cat.slug);
                const displayCount = displayCards(cat);
                const activeCount = activeCards(cat);
                const totalCount = totalCards(cat);
                return (
                  <article key={cat.slug} className={`rounded-2xl border p-3 ${selected ? 'border-[#e50914]/70 bg-[#e50914]/8' : displayCount === 0 ? 'border-[#f4c46b]/30 bg-[#f4c46b]/8' : 'border-white/8 bg-white/[0.04]'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex min-w-0 gap-2"><input type="checkbox" checked={selected} onChange={(event) => setSelectedCategories((current) => event.target.checked ? [...new Set([...current, cat.slug])] : current.filter((slug) => slug !== cat.slug))} className="mt-1 h-4 w-4 accent-[#e50914]" /><div className="min-w-0"><p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-[#e50914]/80">{cat.slug}</p><p className="text-xs font-bold text-white/38">แสดงบนหน้าเว็บ: {cat.enabled ? 'เปิด' : 'ปิด'} · Auto Carousel: {cat.autoplay ? 'เปิด' : 'ปิด'} · แสดงจริง {displayCount} / เปิดอยู่ {activeCount} / ทั้งหมด {totalCount} การ์ด</p>{displayCount === 0 ? <p className="mt-1 text-[10px] font-black text-[#f4c46b]">ไม่มีการ์ดแสดงบนหน้าเว็บ</p> : null}</div></label>
                      <div className="flex shrink-0 gap-1.5"><button onClick={() => void patchCategory(cat.slug, { autoplay: !cat.autoplay })} className={`rounded-xl px-3 py-2 text-[10px] font-black ${cat.autoplay ? 'bg-sky-400/15 text-sky-100' : 'bg-white/[0.08] text-white/45'}`}>{cat.autoplay ? 'AUTO' : 'MANUAL'}</button><button onClick={() => void patchCategory(cat.slug, { enabled: !cat.enabled })} className={`rounded-xl px-3 py-2 text-[10px] font-black ${cat.enabled ? 'bg-emerald-400/15 text-emerald-100' : 'bg-white/[0.08] text-white/45'}`}>{cat.enabled ? 'ON' : 'OFF'}</button></div>
                    </div>
                    <div className="mt-3 grid gap-2"><input className={input} value={cat.title_th} onChange={(event) => setCategories((current) => current.map((item) => item.slug === cat.slug ? { ...item, title_th: event.target.value } : item))} onBlur={(event) => void patchCategory(cat.slug, { title_th: event.target.value })} placeholder="ชื่อหมวด" /><input className={input} value={cat.subtitle_th || ''} onChange={(event) => setCategories((current) => current.map((item) => item.slug === cat.slug ? { ...item, subtitle_th: event.target.value } : item))} onBlur={(event) => void patchCategory(cat.slug, { subtitle_th: event.target.value })} placeholder="คำอธิบายหมวด" /><input className={input} type="number" value={cat.sort_order} onChange={(event) => setCategories((current) => current.map((item) => item.slug === cat.slug ? { ...item, sort_order: Number(event.target.value) } : item))} onBlur={(event) => void patchCategory(cat.slug, { sort_order: Number(event.target.value) })} placeholder="ลำดับ" /></div>
                    <div className="mt-3 flex flex-wrap gap-1.5"><button className={ghostBtn} onClick={() => { setBucket(cat.slug); void loadCards(cat.slug); }}>ดูการ์ดทั้งหมด ({totalCount})</button></div>
                  </article>
                );
              })}
              {!filteredCategories.length ? <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center text-xs font-black text-white/45">ไม่พบหมวดตามตัวกรอง {categoryFilterLabel(categoryFilter)}</div> : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-black/35 p-3 md:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-black">การ์ดหนัง / ซีรีส์</h3><p className="text-[10px] font-black text-white/35">{cards.length} รายการ · เลือก {selectedCards.length}</p></div><div className="flex gap-1.5"><button className={ghostBtn} onClick={() => setSelectedCards(cards.map(cardKey))}>เลือกทั้งหมด</button><button className={ghostBtn} onClick={() => setSelectedCards([])}>ไม่เลือกทั้งหมด</button></div></div>
            <div className="mb-4 grid gap-2 md:grid-cols-[1fr_160px_160px_auto]"><input className={input} value={q} onChange={(event) => setQ(event.target.value)} placeholder="ค้นหาชื่อหนัง" /><select className={selectInput} value={bucket} onChange={(event) => { setBucket(event.target.value); void loadCards(event.target.value); }}><option value="all">ทุกหมวด</option>{categoryOptions.map((cat) => <option key={cat.slug} value={cat.slug}>{cat.title_th}</option>)}</select><select className={selectInput} value={active} onChange={(event) => setActive(event.target.value)}><option value="all">ทุกสถานะ</option><option value="true">แสดงบนหน้าเว็บ</option><option value="false">ไม่แสดงบนหน้าเว็บ</option></select><button onClick={() => void loadCards()} disabled={loading} className={ghostBtn}>ค้นหา</button></div>
            <div className="mb-4 flex flex-wrap gap-1.5"><button className={ghostBtn} disabled={!selectedCards.length || loading} onClick={() => void bulkPatchCards({ is_active: true })}>แสดงที่เลือก</button><button className={ghostBtn} disabled={!selectedCards.length || loading} onClick={() => void bulkPatchCards({ is_active: false })}>ซ่อนที่เลือก</button><select className={selectInput} value={bulkBucket} onChange={(event) => setBulkBucket(event.target.value)}><option value="">เลือกหมวดเพื่อย้าย</option>{categoryOptions.map((cat) => <option key={cat.slug} value={cat.slug}>{cat.title_th}</option>)}</select><button className={redBtn} disabled={!selectedCards.length || !bulkBucket || loading} onClick={() => void bulkPatchCards({ source_bucket: bulkBucket })}>ย้ายที่เลือก</button></div>
            <div className="grid max-h-[680px] gap-3 overflow-y-auto pr-1">
              {cards.map((card) => {
                const key = cardKey(card);
                const selected = selectedCards.includes(key);
                return (
                  <article key={key} className={`grid gap-3 rounded-2xl border p-3 md:grid-cols-[20px_56px_1fr] ${selected ? 'border-[#e50914]/70 bg-[#e50914]/8' : card.is_active === false ? 'border-[#f4c46b]/30 bg-[#f4c46b]/8' : 'border-white/8 bg-white/[0.04]'}`}>
                    <input type="checkbox" checked={selected} onChange={(event) => setSelectedCards((current) => event.target.checked ? [...new Set([...current, key])] : current.filter((item) => item !== key))} className="mt-7 h-4 w-4 accent-[#e50914]" />
                    <div className="h-[82px] w-14 overflow-hidden rounded-lg bg-white/[0.06]">{card.poster_url ? <img src={card.poster_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}</div>
                    <div className="min-w-0"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-black text-white/90">{card.title_en || card.title}</p><p className="mt-1 text-[10px] font-bold text-white/38">{card.media_type === 'tv' ? 'ซีรีส์' : 'หนัง'} · TMDB {card.tmdb_id} · ★ {Number(card.rating || 0).toFixed(1)} · {card.release_year || '-'}</p></div><div className="flex shrink-0 flex-wrap gap-1.5"><button onClick={() => void patchCard(card, { is_active: !card.is_active })} className={`rounded-xl px-3 py-2 text-[10px] font-black ${card.is_active ? 'bg-emerald-400/15 text-emerald-100' : 'bg-white/[0.08] text-white/45'}`}>{card.is_active ? 'แสดง' : 'ซ่อน'}</button>{card.media_type === 'tv' ? <button onClick={() => setEpisodeEditorCard(card)} className={redBtn}>จัดการตอน</button> : null}</div></div><div className="mt-3 grid gap-2 md:grid-cols-[1fr_130px]"><select className={selectInput} value={card.source_bucket || ''} onChange={(event) => void patchCard(card, { source_bucket: event.target.value })}><option value="">ไม่ระบุหมวด</option>{categoryOptions.map((cat) => <option key={cat.slug} value={cat.slug}>{cat.title_th}</option>)}</select><input className={input} type="number" value={String(card.sort_score || 0)} onChange={(event) => setCards((current) => current.map((item) => item.tmdb_id === card.tmdb_id && item.media_type === card.media_type ? { ...item, sort_score: Number(event.target.value) } : item))} onBlur={(event) => void patchCard(card, { sort_score: Number(event.target.value) })} placeholder="ลำดับ" /></div></div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <AdminSeriesEpisodeEditor card={episodeEditorCard} onClose={() => setEpisodeEditorCard(null)} onSaved={() => void refreshAll()} setMessage={setMessage} />
    </section>
  );
}
