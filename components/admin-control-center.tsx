// @ts-nocheck
'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminSessionHeaders } from '@/lib/admin-session-browser';
import { adminInputClass, adminSelectClass } from '@/lib/admin-ui-classes';

type Category = { slug: string; title_th: string; subtitle_th?: string | null; enabled: boolean; autoplay?: boolean; sort_order: number; updated_at?: string; card_count?: number };
type Card = { tmdb_id: number; media_type: 'movie' | 'tv'; title: string; title_en?: string | null; poster_url?: string | null; rating?: number | string | null; release_year?: string | null; source_bucket?: string | null; sort_score?: number | string | null; is_active: boolean };

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

function uniqueCards(cards: Card[]) {
  const map = new Map<string, Card>();
  cards.forEach((card) => map.set(cardKey(card), card));
  return [...map.values()];
}

export function AdminControlCenter() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [q, setQ] = useState('');
  const [bucket, setBucket] = useState('all');
  const [active, setActive] = useState('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [bulkBucket, setBulkBucket] = useState('');
  const [modalCategory, setModalCategory] = useState<Category | null>(null);
  const [modalCards, setModalCards] = useState<Card[]>([]);
  const [modalSearchCards, setModalSearchCards] = useState<Card[]>([]);
  const [modalQ, setModalQ] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalChanges, setModalChanges] = useState<Record<string, string | null>>({});
  const [modalSelectedAssigned, setModalSelectedAssigned] = useState<string[]>([]);
  const [modalSelectedSearch, setModalSelectedSearch] = useState<string[]>([]);

  const categoryOptions = useMemo(() => categories.filter((item) => item.slug), [categories]);
  const selectedCategoryCount = selectedCategories.length;
  const selectedCardCount = selectedCards.length;
  const modalAssigned = useMemo(() => {
    if (!modalCategory) return [];
    return uniqueCards(modalCards).filter((card) => {
      const next = modalChanges[cardKey(card)];
      if (next === null) return false;
      return next === modalCategory.slug || card.source_bucket === modalCategory.slug;
    });
  }, [modalCards, modalChanges, modalCategory]);

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

  async function patchCategory(slug: string, patch: Partial<Category>) {
    const previous = categories;
    setCategories((current) => current.map((item) => item.slug === slug ? { ...item, ...patch } : item));
    try {
      const response = await fetch('/api/admin/categories', { method: 'PATCH', headers: adminSessionHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ slug, ...patch }) });
      const payload = await response.json() as CategoryPayload;
      if (!payload.ok) throw new Error(payload.error || 'บันทึกหมวดไม่สำเร็จ');
      setMessage('บันทึกหมวดแล้ว');
    } catch (error) {
      setCategories(previous);
      setMessage(error instanceof Error ? error.message : 'บันทึกหมวดไม่สำเร็จ');
    }
  }

  async function bulkPatchCategories(enabled: boolean) {
    if (!selectedCategories.length) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/categories', { method: 'PATCH', headers: adminSessionHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ slugs: selectedCategories, enabled }) });
      const payload = await response.json() as CategoryPayload;
      if (!payload.ok) throw new Error(payload.error || 'บันทึกหมวดไม่สำเร็จ');
      setMessage(`${enabled ? 'เปิด' : 'ปิด'}หมวดที่เลือกแล้ว`);
      setSelectedCategories([]);
      await loadCategories();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกหมวดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  async function deleteCategories(slugs: string[]) {
    if (!slugs.length) return;
    const ok = window.confirm(`ต้องการลบ ${slugs.length} หมวดใช่ไหม? การ์ดในหมวดจะถูกเอาออกจากหมวดนั้นด้วย`);
    if (!ok) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/categories', { method: 'DELETE', headers: adminSessionHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ slugs }) });
      const payload = await response.json() as { ok?: boolean; error?: string };
      if (!payload.ok) throw new Error(payload.error || 'ลบหมวดไม่สำเร็จ');
      setMessage('ลบหมวดที่เลือกแล้ว');
      setSelectedCategories([]);
      await refreshAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ลบหมวดไม่สำเร็จ');
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
      if (patch.source_bucket !== undefined) void loadCategories();
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

  async function loadModalCategoryCards(category: Category) {
    setModalLoading(true);
    try {
      const params = new URLSearchParams({ bucket: category.slug, limit: '300' });
      const response = await fetch(`/api/admin/cards?${params.toString()}`, { headers: adminSessionHeaders(), cache: 'no-store' });
      const payload = await response.json() as CardPayload;
      setModalCards(payload.cards || []);
      setModalSelectedAssigned([]);
    } finally {
      setModalLoading(false);
    }
  }

  async function searchModalCards() {
    setModalLoading(true);
    try {
      const params = new URLSearchParams({ limit: '120' });
      if (modalQ.trim()) params.set('q', modalQ.trim());
      const response = await fetch(`/api/admin/cards?${params.toString()}`, { headers: adminSessionHeaders(), cache: 'no-store' });
      const payload = await response.json() as CardPayload;
      setModalSearchCards(payload.cards || []);
      setModalSelectedSearch([]);
    } finally {
      setModalLoading(false);
    }
  }

  function openCategoryModal(category: Category) {
    setModalCategory(category);
    setModalChanges({});
    setModalQ('');
    setModalSearchCards([]);
    setModalSelectedAssigned([]);
    setModalSelectedSearch([]);
    void loadModalCategoryCards(category);
  }

  function closeCategoryModal() {
    setModalCategory(null);
    setModalCards([]);
    setModalSearchCards([]);
    setModalChanges({});
  }

  function modalAddCards(keys: string[]) {
    if (!modalCategory) return;
    const searchMap = new Map(modalSearchCards.map((card) => [cardKey(card), card]));
    setModalChanges((current) => {
      const next = { ...current };
      keys.forEach((key) => { next[key] = modalCategory.slug; });
      return next;
    });
    setModalCards((current) => uniqueCards([...current, ...keys.map((key) => searchMap.get(key)).filter(Boolean).map((card) => ({ ...card, source_bucket: modalCategory.slug }))]));
    setModalSelectedSearch([]);
  }

  function modalRemoveCards(keys: string[]) {
    setModalChanges((current) => {
      const next = { ...current };
      keys.forEach((key) => { next[key] = null; });
      return next;
    });
    setModalSelectedAssigned([]);
  }

  async function saveModalCategoryCards() {
    if (!modalCategory) return;
    const changes = Object.entries(modalChanges).map(([key, value]) => cardPayloadFromKey(key, { source_bucket: value || '' }));
    if (!changes.length) {
      closeCategoryModal();
      return;
    }
    setModalLoading(true);
    try {
      const response = await fetch('/api/admin/cards', { method: 'PATCH', headers: adminSessionHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ cards: changes }) });
      const payload = await response.json() as CardPayload;
      if (!payload.ok) throw new Error(payload.error || 'บันทึกการ์ดในหมวดไม่สำเร็จ');
      setMessage(`บันทึกการ์ดในหมวด ${modalCategory.title_th} แล้ว`);
      closeCategoryModal();
      await refreshAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกการ์ดในหมวดไม่สำเร็จ');
    } finally {
      setModalLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  return (
    <section id="admin-control-center" className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
      <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_28px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e50914]">Control Center</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] md:text-4xl">ควบคุมหน้าเว็บ / หมวด / การ์ด</h2>
            <p className="mt-1 text-xs font-semibold text-white/42">เลือกหลายรายการแล้วเปิด/ปิด ย้ายหมวด หรือลบได้ทีเดียว</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={seedCategories} disabled={loading} className={ghostBtn}>เติมหมวด default</button>
            <button onClick={() => void refreshAll()} disabled={loading} className={redBtn}>Refresh</button>
          </div>
        </div>

        {message ? <div className="mt-4 rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-xs font-bold text-white/70">{message}</div> : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.3fr]">
          <div className="rounded-[24px] border border-white/10 bg-black/35 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div><h3 className="text-lg font-black">หมวดหมู่หน้าแรก</h3><p className="text-[10px] font-black text-white/35">{categories.length} หมวด · เลือก {selectedCategoryCount}</p></div>
              <div className="flex flex-wrap gap-1.5"><button className={ghostBtn} onClick={() => setSelectedCategories(categories.map((cat) => cat.slug))}>เลือกทั้งหมด</button><button className={ghostBtn} onClick={() => setSelectedCategories([])}>ไม่เลือกทั้งหมด</button></div>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <button className={ghostBtn} disabled={!selectedCategoryCount || loading} onClick={() => void bulkPatchCategories(true)}>เปิดที่เลือก</button>
              <button className={ghostBtn} disabled={!selectedCategoryCount || loading} onClick={() => void bulkPatchCategories(false)}>ปิดที่เลือก</button>
              <button className={redBtn} disabled={!selectedCategoryCount || loading} onClick={() => void deleteCategories(selectedCategories)}>ลบที่เลือก</button>
            </div>
            <div className="grid max-h-[680px] gap-3 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const selected = selectedCategories.includes(cat.slug);
                return (
                  <article key={cat.slug} className={`rounded-2xl border p-3 ${selected ? 'border-[#e50914]/70 bg-[#e50914]/8' : 'border-white/8 bg-white/[0.04]'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex min-w-0 gap-2"><input type="checkbox" checked={selected} onChange={(event) => setSelectedCategories((current) => event.target.checked ? [...new Set([...current, cat.slug])] : current.filter((slug) => slug !== cat.slug))} className="mt-1 h-4 w-4 accent-[#e50914]" /><div className="min-w-0"><p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-[#e50914]/80">{cat.slug}</p><p className="text-xs font-bold text-white/38">แสดงบนหน้าเว็บ: {cat.enabled ? 'เปิด' : 'ปิด'} · {cat.card_count || 0} การ์ด</p></div></label>
                      <button onClick={() => void patchCategory(cat.slug, { enabled: !cat.enabled })} className={`rounded-xl px-3 py-2 text-[10px] font-black ${cat.enabled ? 'bg-emerald-400/15 text-emerald-100' : 'bg-white/[0.08] text-white/45'}`}>{cat.enabled ? 'ON' : 'OFF'}</button>
                    </div>
                    <div className="mt-3 grid gap-2">
                      <input className={input} value={cat.title_th} onChange={(event) => setCategories((current) => current.map((item) => item.slug === cat.slug ? { ...item, title_th: event.target.value } : item))} onBlur={(event) => void patchCategory(cat.slug, { title_th: event.target.value })} placeholder="ชื่อหมวด" />
                      <input className={input} value={cat.subtitle_th || ''} onChange={(event) => setCategories((current) => current.map((item) => item.slug === cat.slug ? { ...item, subtitle_th: event.target.value } : item))} onBlur={(event) => void patchCategory(cat.slug, { subtitle_th: event.target.value })} placeholder="คำอธิบายหมวด" />
                      <input className={input} type="number" value={cat.sort_order} onChange={(event) => setCategories((current) => current.map((item) => item.slug === cat.slug ? { ...item, sort_order: Number(event.target.value) } : item))} onBlur={(event) => void patchCategory(cat.slug, { sort_order: Number(event.target.value) })} placeholder="ลำดับ" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5"><button className={ghostBtn} onClick={() => openCategoryModal(cat)}>ดูการ์ดทั้งหมด ({cat.card_count || 0})</button><button className={redBtn} onClick={() => void deleteCategories([cat.slug])}>ลบหมวด</button></div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/35 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-black">การ์ดหนัง / ซีรีส์</h3><p className="text-[10px] font-black text-white/35">{cards.length} รายการ · เลือก {selectedCardCount}</p></div><div className="flex gap-1.5"><button className={ghostBtn} onClick={() => setSelectedCards(cards.map(cardKey))}>เลือกทั้งหมด</button><button className={ghostBtn} onClick={() => setSelectedCards([])}>ไม่เลือกทั้งหมด</button></div></div>
            <div className="mb-4 grid gap-2 md:grid-cols-[1fr_160px_130px_auto]">
              <input className={input} value={q} onChange={(event) => setQ(event.target.value)} placeholder="ค้นหาชื่อหนัง" />
              <select className={selectInput} value={bucket} onChange={(event) => { setBucket(event.target.value); void loadCards(event.target.value); }}><option value="all">ทุกหมวด</option>{categoryOptions.map((cat) => <option key={cat.slug} value={cat.slug}>{cat.title_th}</option>)}</select>
              <select className={selectInput} value={active} onChange={(event) => setActive(event.target.value)}><option value="all">ทุกสถานะ</option><option value="true">เปิดอยู่</option><option value="false">ปิดอยู่</option></select>
              <button onClick={() => void loadCards()} disabled={loading} className={ghostBtn}>ค้นหา</button>
            </div>
            <div className="mb-4 flex flex-wrap gap-1.5">
              <button className={ghostBtn} disabled={!selectedCardCount || loading} onClick={() => void bulkPatchCards({ is_active: true })}>แสดงที่เลือก</button>
              <button className={ghostBtn} disabled={!selectedCardCount || loading} onClick={() => void bulkPatchCards({ is_active: false })}>ซ่อนที่เลือก</button>
              <select className={selectInput} value={bulkBucket} onChange={(event) => setBulkBucket(event.target.value)}><option value="">เลือกหมวดเพื่อย้าย</option>{categoryOptions.map((cat) => <option key={cat.slug} value={cat.slug}>{cat.title_th}</option>)}</select>
              <button className={redBtn} disabled={!selectedCardCount || !bulkBucket || loading} onClick={() => void bulkPatchCards({ source_bucket: bulkBucket })}>ย้ายที่เลือก</button>
            </div>
            <div className="grid max-h-[680px] gap-3 overflow-y-auto pr-1">
              {cards.map((card) => {
                const key = cardKey(card);
                const selected = selectedCards.includes(key);
                return (
                  <article key={key} className={`grid gap-3 rounded-2xl border p-3 md:grid-cols-[20px_56px_1fr] ${selected ? 'border-[#e50914]/70 bg-[#e50914]/8' : 'border-white/8 bg-white/[0.04]'}`}>
                    <input type="checkbox" checked={selected} onChange={(event) => setSelectedCards((current) => event.target.checked ? [...new Set([...current, key])] : current.filter((item) => item !== key))} className="mt-7 h-4 w-4 accent-[#e50914]" />
                    <div className="h-[82px] w-14 overflow-hidden rounded-lg bg-white/[0.06]">{card.poster_url ? <img src={card.poster_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-black text-white/90">{card.title_en || card.title}</p><p className="mt-1 text-[10px] font-bold text-white/38">{card.media_type} · TMDB {card.tmdb_id} · ★ {Number(card.rating || 0).toFixed(1)} · {card.release_year || '-'}</p></div><button onClick={() => void patchCard(card, { is_active: !card.is_active })} className={`rounded-xl px-3 py-2 text-[10px] font-black ${card.is_active ? 'bg-emerald-400/15 text-emerald-100' : 'bg-white/[0.08] text-white/45'}`}>{card.is_active ? 'แสดง' : 'ซ่อน'}</button></div>
                      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_130px]"><select className={selectInput} value={card.source_bucket || ''} onChange={(event) => void patchCard(card, { source_bucket: event.target.value })}><option value="">ไม่ระบุหมวด</option>{categoryOptions.map((cat) => <option key={cat.slug} value={cat.slug}>{cat.title_th}</option>)}</select><input className={input} type="number" value={String(card.sort_score || 0)} onChange={(event) => setCards((current) => current.map((item) => item.tmdb_id === card.tmdb_id && item.media_type === card.media_type ? { ...item, sort_score: Number(event.target.value) } : item))} onBlur={(event) => void patchCard(card, { sort_score: Number(event.target.value) })} placeholder="ลำดับ" /></div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {modalCategory ? (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/70 p-4 text-white backdrop-blur-xl">
          <div className="mx-auto max-w-6xl rounded-[34px] bg-black/72 p-4 shadow-[0_40px_140px_rgba(0,0,0,0.92),inset_0_1px_0_rgba(255,255,255,0.14)] md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e50914]">Category Modal</p><h3 className="mt-1 text-2xl font-black tracking-[-0.05em]">จัดการการ์ดในหมวด: {modalCategory.title_th}</h3><p className="text-xs font-bold text-white/42">เพิ่ม/ลบการ์ดแล้วกดบันทึก ข้อมูลจะอัปเดตทีเดียว</p></div><button className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.08] text-xl font-black" onClick={closeCategoryModal}>×</button></div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="rounded-[24px] bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h4 className="font-black">การ์ดในหมวดนี้ ({modalAssigned.length})</h4><div className="flex gap-1.5"><button className={ghostBtn} onClick={() => setModalSelectedAssigned(modalAssigned.map(cardKey))}>เลือกทั้งหมด</button><button className={ghostBtn} onClick={() => setModalSelectedAssigned([])}>ไม่เลือกทั้งหมด</button><button className={redBtn} disabled={!modalSelectedAssigned.length} onClick={() => modalRemoveCards(modalSelectedAssigned)}>ลบที่เลือกออก</button></div></div>
                <div className="grid max-h-[520px] gap-2 overflow-y-auto pr-1">{modalAssigned.map((card) => { const key = cardKey(card); const selected = modalSelectedAssigned.includes(key); return <article key={key} className={`grid grid-cols-[18px_42px_1fr_auto] items-center gap-2 rounded-2xl p-2 ${selected ? 'bg-[#e50914]/12' : 'bg-black/35'}`}><input type="checkbox" checked={selected} onChange={(event) => setModalSelectedAssigned((current) => event.target.checked ? [...new Set([...current, key])] : current.filter((item) => item !== key))} className="h-4 w-4 accent-[#e50914]" /><div className="h-14 w-10 overflow-hidden rounded bg-white/[0.06]">{card.poster_url ? <img src={card.poster_url} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0"><p className="truncate text-xs font-black">{card.title_en || card.title}</p><p className="text-[10px] text-white/38">{card.release_year || '-'} · ★ {Number(card.rating || 0).toFixed(1)}</p></div><button className={ghostBtn} onClick={() => modalRemoveCards([key])}>ลบ</button></article>; })}</div>
              </div>
              <div className="rounded-[24px] bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="mb-3 flex gap-2"><input className={input + ' flex-1'} value={modalQ} onChange={(event) => setModalQ(event.target.value)} placeholder="ค้นหาการ์ดเพื่อเพิ่มเข้าหมวด" /><button className={redBtn} disabled={modalLoading} onClick={() => void searchModalCards()}>ค้นหา</button></div>
                <div className="mb-3 flex flex-wrap gap-1.5"><button className={ghostBtn} onClick={() => setModalSelectedSearch(modalSearchCards.map(cardKey))}>เลือกทั้งหมด</button><button className={ghostBtn} onClick={() => setModalSelectedSearch([])}>ไม่เลือกทั้งหมด</button><button className={redBtn} disabled={!modalSelectedSearch.length} onClick={() => modalAddCards(modalSelectedSearch)}>เพิ่มที่เลือก</button></div>
                <div className="grid max-h-[520px] gap-2 overflow-y-auto pr-1">{modalSearchCards.map((card) => { const key = cardKey(card); const selected = modalSelectedSearch.includes(key); const alreadyIn = modalAssigned.some((item) => cardKey(item) === key); return <article key={key} className={`grid grid-cols-[18px_42px_1fr_auto] items-center gap-2 rounded-2xl p-2 ${selected ? 'bg-[#e50914]/12' : 'bg-black/35'}`}><input type="checkbox" checked={selected} onChange={(event) => setModalSelectedSearch((current) => event.target.checked ? [...new Set([...current, key])] : current.filter((item) => item !== key))} className="h-4 w-4 accent-[#e50914]" /><div className="h-14 w-10 overflow-hidden rounded bg-white/[0.06]">{card.poster_url ? <img src={card.poster_url} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0"><p className="truncate text-xs font-black">{card.title_en || card.title}</p><p className="text-[10px] text-white/38">{card.source_bucket || 'ไม่ระบุหมวด'} · {card.release_year || '-'}</p></div><button className={alreadyIn ? ghostBtn : redBtn} disabled={alreadyIn} onClick={() => modalAddCards([key])}>{alreadyIn ? 'อยู่แล้ว' : 'เพิ่ม'}</button></article>; })}</div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2"><button className={ghostBtn} onClick={closeCategoryModal}>ยกเลิก</button><button className={redBtn} disabled={modalLoading} onClick={() => void saveModalCategoryCards()}>บันทึกและปิด Modal</button></div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
