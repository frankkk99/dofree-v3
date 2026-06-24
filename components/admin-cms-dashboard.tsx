'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

type MediaType = 'movie' | 'tv';
type MovieStatus = 'draft' | 'review' | 'published' | 'broken' | 'hidden';
type AdminFilter = 'all' | 'missing' | 'broken' | 'movie' | 'series' | 'thai' | 'hd' | 'zoom' | 'top-rated' | 'ready' | 'draft-review';
type AdminSort = 'rating' | 'updated';

type AdminMovieLink = {
  id: string;
  tmdb_id: number;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  is_active: boolean;
  notes?: string | null;
  section_slug: string;
  status: MovieStatus;
  created_at?: string;
  updated_at?: string;
  poster_url?: string | null;
  backdrop_url?: string | null;
  rating?: number;
  year?: string;
  language?: string;
  runtime?: number | null;
  genres?: string[];
};

type LinkReport = {
  id: string;
  tmdb_id?: number | null;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  url?: string | null;
  reason: string;
  detail?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type AdminPayload = {
  ok: boolean;
  links?: AdminMovieLink[];
  reports?: LinkReport[];
  error?: string;
};

type EditorForm = {
  id: string;
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
  poster_url: string;
  backdrop_url: string;
  rating: string;
  year: string;
  language: string;
  genres: string[];
  runtime: string;
};

type AdminCard = {
  key: string;
  tone: 'missing' | 'broken' | 'ready' | 'draft';
  item: AdminMovieLink;
  report?: LinkReport;
};

const emptyForm: EditorForm = {
  id: '',
  tmdb_id: '',
  media_type: 'movie',
  title: '',
  title_th: '',
  watch_url: '',
  trailer_url: '',
  section_slug: 'watch-ready',
  status: 'draft',
  provider: 'google-drive',
  notes: '',
  poster_url: '',
  backdrop_url: '',
  rating: '',
  year: '',
  language: '',
  genres: [],
  runtime: '',
};

const fallbackMissing: AdminMovieLink[] = Array.from({ length: 12 }, (_, index) => ({
  id: `fallback-missing-${index}`,
  tmdb_id: 91000 + index,
  media_type: index % 5 === 0 ? 'tv' : 'movie',
  title: `Waiting Movie ${index + 1}`,
  title_th: `หนังรอใส่ลิงก์ ${index + 1}`,
  watch_url: null,
  trailer_url: null,
  provider: null,
  is_active: true,
  notes: 'ตัวอย่าง layout เมื่อยังไม่ได้โหลดข้อมูลจริง',
  section_slug: index % 3 === 0 ? 'thai' : 'watch-ready',
  status: index % 2 === 0 ? 'draft' : 'review',
  rating: 8.8 - index * 0.12,
  year: String(2026 - (index % 4)),
  language: index % 3 === 0 ? 'th' : 'en',
  genres: index % 3 === 0 ? ['ดราม่า', 'ไทย'] : ['แอ็กชัน', 'ระทึกขวัญ'],
}));

const fallbackBroken: AdminMovieLink[] = Array.from({ length: 8 }, (_, index) => ({
  id: `fallback-broken-${index}`,
  tmdb_id: 92000 + index,
  media_type: 'movie',
  title: `Broken Link ${index + 1}`,
  title_th: `หนังลิงก์เสีย ${index + 1}`,
  watch_url: 'https://drive.google.com/file/d/example/preview',
  trailer_url: null,
  provider: 'google-drive',
  is_active: true,
  notes: 'ตัวอย่างรายการที่ถูกแจ้งลิงก์เสีย',
  section_slug: 'watch-ready',
  status: 'broken',
  rating: 8.5 - index * 0.1,
  year: String(2026 - (index % 3)),
  language: 'en',
  genres: ['ดราม่า', 'ระทึกขวัญ'],
}));

const filterButtons: { id: AdminFilter; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'missing', label: 'ยังไม่มีลิงก์' },
  { id: 'broken', label: 'ลิงก์เสีย' },
  { id: 'draft-review', label: 'รอตรวจ' },
  { id: 'movie', label: 'ภาพยนตร์' },
  { id: 'series', label: 'ซีรีส์' },
  { id: 'thai', label: 'หนังไทย' },
  { id: 'top-rated', label: 'คะแนนสูง' },
  { id: 'hd', label: 'HD' },
  { id: 'zoom', label: 'ZOOM' },
  { id: 'ready', label: 'พร้อมดู' },
];

function StatusPill({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black ${active ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/60'}`}>
      {children}
    </span>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-xs font-black text-white/48">{children}</span>;
}

function inputClass() {
  return 'mt-2 h-11 w-full rounded-2xl bg-white/[0.075] px-4 text-sm font-bold text-white outline-none ring-1 ring-white/[0.06] transition placeholder:text-white/24 focus:bg-white/[0.105] focus:ring-[#e50914]/60';
}

function textAreaClass() {
  return 'mt-2 min-h-[92px] w-full resize-none rounded-2xl bg-white/[0.075] px-4 py-3 text-sm font-bold leading-6 text-white outline-none ring-1 ring-white/[0.06] transition placeholder:text-white/24 focus:bg-white/[0.105] focus:ring-[#e50914]/60';
}

function formatDate(value?: string) {
  if (!value) return 'ยังไม่ระบุ';
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function movieTitle(item: AdminMovieLink) {
  return item.title_th || item.title || `TMDB ${item.tmdb_id}`;
}

function itemScore(item: AdminMovieLink) {
  return Number(item.rating || 0);
}

function itemYear(item: AdminMovieLink) {
  return item.year || item.created_at?.slice(0, 4) || '2026';
}

function itemBadges(item: AdminMovieLink, tone: AdminCard['tone']) {
  const badges = [tone === 'broken' ? 'ลิงก์เสีย' : !item.watch_url ? 'ยังไม่มีลิงก์' : 'พร้อมดู'];
  if (item.rating && item.rating >= 8) badges.push('8+');
  if (item.status === 'review') badges.push('ZOOM');
  if (item.watch_url) badges.push('HD');
  if (item.language === 'th') badges.push('พากย์ไทย');
  return badges.slice(0, 3);
}

function itemToForm(item: AdminMovieLink): EditorForm {
  return {
    id: item.id?.startsWith('fallback-') ? '' : item.id,
    tmdb_id: item.tmdb_id ? String(item.tmdb_id) : '',
    media_type: item.media_type || 'movie',
    title: item.title || '',
    title_th: item.title_th || '',
    watch_url: item.watch_url || '',
    trailer_url: item.trailer_url || '',
    section_slug: item.section_slug || 'watch-ready',
    status: item.status || 'draft',
    provider: item.provider || 'google-drive',
    notes: item.notes || '',
    poster_url: item.poster_url || '',
    backdrop_url: item.backdrop_url || '',
    rating: item.rating ? String(item.rating) : '',
    year: item.year || '',
    language: item.language || '',
    genres: item.genres || [],
    runtime: item.runtime ? String(item.runtime) : '',
  };
}

function formToItem(form: EditorForm): AdminMovieLink {
  return {
    id: form.id,
    tmdb_id: Number(form.tmdb_id) || 0,
    media_type: form.media_type,
    title: form.title || null,
    title_th: form.title_th || form.title || null,
    watch_url: form.watch_url || null,
    trailer_url: form.trailer_url || null,
    provider: form.provider || null,
    is_active: form.status !== 'hidden',
    notes: form.notes || null,
    section_slug: form.section_slug || 'watch-ready',
    status: form.status,
    poster_url: form.poster_url || null,
    backdrop_url: form.backdrop_url || null,
    rating: Number(form.rating || 0),
    year: form.year || undefined,
    language: form.language || undefined,
    runtime: Number(form.runtime || 0) || null,
    genres: form.genres,
  };
}

function toCard(item: AdminMovieLink, tone: AdminCard['tone'], report?: LinkReport): AdminCard {
  return {
    key: `${tone}-${item.id || item.tmdb_id}-${report?.id || ''}`,
    tone,
    item,
    report,
  };
}

function sortCards(cards: AdminCard[], sortMode: AdminSort) {
  return [...cards].sort((a, b) => {
    if (sortMode === 'updated') {
      return new Date(b.item.updated_at || b.item.created_at || 0).getTime() - new Date(a.item.updated_at || a.item.created_at || 0).getTime();
    }
    return itemScore(b.item) - itemScore(a.item);
  });
}

function matchesFilter(card: AdminCard, activeFilter: AdminFilter) {
  const item = card.item;
  if (activeFilter === 'all') return true;
  if (activeFilter === 'missing') return !item.watch_url || item.status === 'draft' || item.status === 'review';
  if (activeFilter === 'broken') return card.tone === 'broken' || item.status === 'broken';
  if (activeFilter === 'draft-review') return item.status === 'draft' || item.status === 'review';
  if (activeFilter === 'movie') return item.media_type === 'movie';
  if (activeFilter === 'series') return item.media_type === 'tv';
  if (activeFilter === 'thai') return item.language === 'th' || item.section_slug === 'thai' || Boolean(item.genres?.some((genre) => genre.includes('ไทย')));
  if (activeFilter === 'top-rated') return itemScore(item) >= 8;
  if (activeFilter === 'hd') return Boolean(item.watch_url) || item.status === 'published';
  if (activeFilter === 'zoom') return item.status === 'review' || item.notes?.toLowerCase().includes('zoom');
  if (activeFilter === 'ready') return Boolean(item.watch_url) && item.status === 'published';
  return true;
}

function AdminPosterCard({ card, onOpen }: { card: AdminCard; onOpen: (card: AdminCard) => void }) {
  const item = card.item;
  const badges = itemBadges(item, card.tone);
  const rating = itemScore(item);

  return (
    <button
      type="button"
      onClick={() => onOpen(card)}
      className="group relative aspect-[2/3] min-w-0 overflow-hidden rounded-[10px] bg-[#111] text-left shadow-[0_16px_44px_rgba(0,0,0,0.62)] transition duration-300 hover:-translate-y-1 hover:shadow-glow md:rounded-[12px] md:shadow-[0_24px_70px_rgba(0,0,0,0.65)]"
      aria-label={`แก้ไข ${movieTitle(item)}`}
    >
      {item.poster_url ? (
        <img src={item.poster_url} alt={movieTitle(item)} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 group-hover:scale-110" />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_24%,#8a111b,#111_62%)] p-3 text-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/44">TMDB</p>
            <p className="mt-2 text-2xl font-black tracking-[-0.08em] text-white md:text-3xl">{item.tmdb_id || '-'}</p>
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.0)_38%,rgba(0,0,0,0.94)_100%)]" />
      <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(circle_at_50%_35%,rgba(229,9,20,0.2),transparent_16rem)]" />

      <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1 pr-1 md:left-3 md:top-3 md:gap-1.5 md:pr-2">
        {badges.slice(0, 2).map((name) => (
          <span key={name} className={`${name === 'ลิงก์เสีย' ? 'bg-red-600 text-white' : name === 'ยังไม่มีลิงก์' ? 'bg-[#f4c46b] text-black' : 'bg-[#e50914] text-white'} rounded px-1.5 py-0.5 text-[7px] font-black shadow-lg backdrop-blur-md md:rounded-md md:px-2 md:py-1 md:text-[10px]`}>
            {name}
          </span>
        ))}
      </div>

      <div className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/48 text-[10px] font-black text-white/72 opacity-0 shadow-xl backdrop-blur-xl transition group-hover:opacity-100 md:right-3 md:top-3 md:h-8 md:w-8 md:text-xs">แก้</div>

      <div className="absolute inset-x-0 bottom-0 p-2 md:p-3.5">
        <div className="mb-1 flex items-center gap-1 text-[7px] font-black uppercase tracking-[0.1em] text-white/38 md:mb-2 md:gap-2 md:text-[10px] md:tracking-[0.16em]">
          <span>{item.media_type === 'tv' ? 'Series' : 'Movie'}</span>
          <span>•</span>
          <span>{item.status}</span>
        </div>
        <h3 className="line-clamp-2 text-[9px] font-black leading-tight text-white drop-shadow sm:text-[11px] md:text-[15px]">{movieTitle(item)}</h3>
        <div className="mt-1 flex items-center gap-1 text-[8px] font-bold text-white/58 md:mt-2 md:gap-2 md:text-[11px]">
          <span className="text-[#f4c46b]">★ {rating.toFixed(1)}</span>
          <span>•</span>
          <span>{itemYear(item)}</span>
        </div>
      </div>
    </button>
  );
}

function AdminControls({ activeFilter, setActiveFilter, sortMode, setSortMode }: {
  activeFilter: AdminFilter;
  setActiveFilter: (filter: AdminFilter) => void;
  sortMode: AdminSort;
  setSortMode: (sort: AdminSort) => void;
}) {
  return (
    <div className="rounded-[24px] bg-white/[0.035] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.055] backdrop-blur-2xl md:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">Admin Filter</p>
          <p className="mt-1 text-xs font-semibold text-white/42">เริ่มต้นเรียงจากคะแนนสูงสุด แล้วกรองต่อได้ทันที</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setSortMode('rating')} className={`h-8 rounded-full px-3 text-[10px] font-black ${sortMode === 'rating' ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/58'}`}>คะแนนสูงสุด</button>
          <button type="button" onClick={() => setSortMode('updated')} className={`h-8 rounded-full px-3 text-[10px] font-black ${sortMode === 'updated' ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/58'}`}>อัปเดตล่าสุด</button>
        </div>
      </div>
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
        {filterButtons.map((button) => (
          <button key={button.id} type="button" onClick={() => setActiveFilter(button.id)} className={`h-8 shrink-0 rounded-full px-3 text-[10px] font-black transition ${activeFilter === button.id ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/58 hover:bg-white/[0.11] hover:text-white'}`}>
            {button.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MovieGridSection({ title, eyebrow, description, cards, visibleCount, onMore, onOpen }: {
  title: string;
  eyebrow: string;
  description: string;
  cards: AdminCard[];
  visibleCount: number;
  onMore: () => void;
  onOpen: (card: AdminCard) => void;
}) {
  const visibleCards = cards.slice(0, visibleCount);
  return (
    <section className="rounded-[30px] bg-white/[0.026] p-4 shadow-[0_26px_90px_rgba(0,0,0,0.48)] backdrop-blur-2xl md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.06em] md:text-4xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-xs font-semibold leading-5 text-white/42 md:text-sm md:leading-6">{description}</p>
        </div>
        <StatusPill active>{cards.length} รายการ</StatusPill>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 md:gap-4 xl:gap-5">
        {visibleCards.map((card) => <AdminPosterCard key={card.key} card={card} onOpen={onOpen} />)}
      </div>

      {!visibleCards.length ? (
        <div className="mt-5 rounded-[24px] bg-black/24 p-8 text-center shadow-inner">
          <p className="text-sm font-black text-white/58">ยังไม่มีรายการในเงื่อนไขนี้</p>
          <p className="mt-1 text-xs font-bold text-white/34">ลองเปลี่ยนปุ่มกรองหรือรีเฟรชข้อมูล</p>
        </div>
      ) : null}

      {visibleCount < cards.length ? (
        <div className="mt-5 text-center">
          <button type="button" onClick={onMore} className="h-11 rounded-2xl bg-white/[0.08] px-6 text-xs font-black text-white/70 shadow-[0_14px_40px_rgba(0,0,0,0.42)] transition hover:bg-white/[0.12] hover:text-white">
            ดูเพิ่มเติมอีก {Math.min(12, cards.length - visibleCount)} รายการ
          </button>
        </div>
      ) : null}
    </section>
  );
}

function EditorModal({ form, setForm, saving, onClose, onSubmit, report }: {
  form: EditorForm;
  setForm: (form: EditorForm) => void;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  report?: LinkReport;
}) {
  const previewItem = formToItem(form);
  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/72 px-3 py-6 text-white backdrop-blur-2xl md:px-6" role="dialog" aria-modal="true">
      <form onSubmit={onSubmit} className="mx-auto max-w-[1040px] overflow-hidden rounded-[34px] bg-[#050505]/92 shadow-[0_44px_160px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
        <section className="relative overflow-hidden p-4 md:p-6">
          {previewItem.backdrop_url ? <div className="absolute inset-0 bg-cover bg-center opacity-24" style={{ backgroundImage: `url(${previewItem.backdrop_url})` }} /> : null}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_14%,rgba(229,9,20,0.32),transparent_24rem),linear-gradient(180deg,rgba(0,0,0,0.18),#050505)]" />
          <button type="button" onClick={onClose} className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/42 text-2xl font-black text-white/70 shadow-[0_14px_50px_rgba(0,0,0,0.72)] backdrop-blur-xl hover:bg-white/10 hover:text-white">×</button>

          <div className="relative z-10 flex flex-col gap-5 md:flex-row">
            <div className="relative h-[190px] w-[128px] shrink-0 overflow-hidden rounded-[22px] bg-[radial-gradient(circle_at_45%_20%,rgba(229,9,20,0.7),rgba(18,18,18,0.95)_68%)] shadow-[0_28px_80px_rgba(0,0,0,0.72)]">
              {previewItem.poster_url ? <img src={previewItem.poster_url} alt={movieTitle(previewItem)} className="absolute inset-0 h-full w-full object-cover" /> : null}
              {!previewItem.poster_url ? (
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/42">TMDB</p>
                    <p className="mt-2 text-3xl font-black tracking-[-0.08em] text-white">{previewItem.tmdb_id || '-'}</p>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pt-1 md:pr-14">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">Admin Movie Editor</p>
              <h2 className="mt-2 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-6xl">{previewItem.title_th || previewItem.title || 'เพิ่ม / แก้ไขหนัง'}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill active>{previewItem.status}</StatusPill>
                <StatusPill>{previewItem.media_type === 'tv' ? 'Series' : 'Movie'}</StatusPill>
                <StatusPill>★ {itemScore(previewItem).toFixed(1)}</StatusPill>
                <StatusPill>{itemYear(previewItem)}</StatusPill>
                <StatusPill>{previewItem.section_slug}</StatusPill>
              </div>
              <p className="mt-4 line-clamp-3 max-w-2xl text-sm font-semibold leading-6 text-white/52">{previewItem.notes || 'ใส่ลิงก์รับชม แก้ชื่อไทย เปลี่ยนสถานะ หรือย้ายหมวด แล้วกดบันทึกด้านล่างใน modal นี้'}</p>
            </div>
          </div>
        </section>

        {report ? (
          <section className="mx-4 rounded-[22px] bg-red-500/[0.085] p-4 shadow-inner md:mx-6">
            <p className="text-xs font-black text-red-100">รายงานจากผู้ใช้</p>
            <p className="mt-1 text-sm font-bold text-white/70">{report.reason} • {formatDate(report.created_at)}</p>
            {report.detail ? <p className="mt-2 text-xs font-semibold leading-5 text-white/46">{report.detail}</p> : null}
          </section>
        ) : null}

        <section className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
          <label className="block">
            <FieldLabel>TMDB ID</FieldLabel>
            <input required inputMode="numeric" value={form.tmdb_id} onChange={(event) => setForm({ ...form, tmdb_id: event.target.value })} placeholder="เช่น 550" className={inputClass()} />
          </label>
          <label className="block">
            <FieldLabel>ประเภท</FieldLabel>
            <select value={form.media_type} onChange={(event) => setForm({ ...form, media_type: event.target.value as MediaType })} className={inputClass()}>
              <option value="movie">Movie</option>
              <option value="tv">Series</option>
            </select>
          </label>
          <label className="block">
            <FieldLabel>ชื่ออังกฤษ / ชื่อหลัก</FieldLabel>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Original title" className={inputClass()} />
          </label>
          <label className="block">
            <FieldLabel>ชื่อไทยที่โชว์บนเว็บ</FieldLabel>
            <input value={form.title_th} onChange={(event) => setForm({ ...form, title_th: event.target.value })} placeholder="ชื่อไทย" className={inputClass()} />
          </label>
          <label className="block md:col-span-2">
            <FieldLabel>ลิงก์รับชม / Google Drive Preview</FieldLabel>
            <input value={form.watch_url} onChange={(event) => setForm({ ...form, watch_url: event.target.value })} placeholder="https://drive.google.com/file/d/.../view" className={inputClass()} />
          </label>
          <label className="block md:col-span-2">
            <FieldLabel>ลิงก์ตัวอย่าง / Trailer URL</FieldLabel>
            <input value={form.trailer_url} onChange={(event) => setForm({ ...form, trailer_url: event.target.value })} placeholder="YouTube / Drive / mp4" className={inputClass()} />
          </label>
          <label className="block">
            <FieldLabel>หมวดแนะนำ</FieldLabel>
            <select value={form.section_slug} onChange={(event) => setForm({ ...form, section_slug: event.target.value })} className={inputClass()}>
              <option value="watch-ready">Watch Ready</option>
              <option value="now-playing">มาใหม่</option>
              <option value="popular">ยอดนิยม</option>
              <option value="thai">หนังไทย</option>
              <option value="top-rated">คะแนนสูง</option>
              <option value="series">ซีรีส์</option>
            </select>
          </label>
          <label className="block">
            <FieldLabel>สถานะ</FieldLabel>
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as MovieStatus })} className={inputClass()}>
              <option value="published">Published / พร้อมดู</option>
              <option value="review">Review / รอตรวจ</option>
              <option value="draft">Draft / ยังไม่เผยแพร่</option>
              <option value="broken">Broken / ลิงก์เสีย</option>
              <option value="hidden">Hidden / ซ่อน</option>
            </select>
          </label>
          <label className="block md:col-span-2">
            <FieldLabel>หมายเหตุ</FieldLabel>
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="เช่น พากย์ไทย / ซับไทย / ไฟล์ส่วนตัว / แก้จาก report" className={textAreaClass()} />
          </label>
        </section>

        <div className="sticky bottom-0 flex flex-col gap-3 bg-[#050505]/86 p-4 shadow-[0_-24px_80px_rgba(0,0,0,0.82)] backdrop-blur-2xl md:flex-row md:items-center md:justify-between md:px-6">
          <p className="text-xs font-bold text-white/38">กดบันทึกแล้วระบบจะอัปเดต Supabase และรีโหลดรายการในหน้าแอดมิน</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-11 rounded-2xl bg-white/[0.08] px-5 text-xs font-black text-white/62 hover:bg-white/[0.12] hover:text-white">ยกเลิก</button>
            <button type="submit" disabled={saving} className="h-11 rounded-2xl bg-[#e50914] px-7 text-xs font-black text-white shadow-glow disabled:opacity-50">{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export function AdminCmsDashboard() {
  const [adminToken, setAdminToken] = useState('');
  const [links, setLinks] = useState<AdminMovieLink[]>([]);
  const [reports, setReports] = useState<LinkReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missingVisible, setMissingVisible] = useState(12);
  const [brokenVisible, setBrokenVisible] = useState(12);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorForm, setEditorForm] = useState<EditorForm>(emptyForm);
  const [activeReport, setActiveReport] = useState<LinkReport | undefined>();
  const [activeFilter, setActiveFilter] = useState<AdminFilter>('all');
  const [sortMode, setSortMode] = useState<AdminSort>('rating');

  useEffect(() => {
    const savedToken = window.localStorage.getItem('dofree_admin_token') || '';
    if (savedToken) {
      setAdminToken(savedToken);
      void loadDashboard(savedToken);
    }
  }, []);

  async function loadDashboard(token = adminToken) {
    if (!token.trim()) {
      setError('ใส่ Admin Token ก่อนโหลดข้อมูลจริง');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/movie-links', {
        headers: { 'x-admin-token': token.trim() },
        cache: 'no-store',
      });
      const payload = (await response.json()) as AdminPayload;

      if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลดข้อมูลไม่สำเร็จ');
      setLinks(payload.links || []);
      setReports(payload.reports || []);
      setMessage('โหลดข้อมูลจาก Supabase แล้ว');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  async function saveToken() {
    window.localStorage.setItem('dofree_admin_token', adminToken.trim());
    await loadDashboard(adminToken.trim());
  }

  function openEditor(item?: AdminMovieLink, report?: LinkReport) {
    setEditorForm(item ? itemToForm(item) : emptyForm);
    setActiveReport(report);
    setEditorOpen(true);
  }

  async function saveEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminToken.trim()) {
      setError('ใส่ Admin Token ก่อนบันทึก');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/movie-links', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-token': adminToken.trim(),
        },
        body: JSON.stringify({ ...editorForm, tmdb_id: Number(editorForm.tmdb_id) }),
      });
      const payload = (await response.json()) as AdminPayload & { link?: AdminMovieLink };

      if (!response.ok || !payload.ok) throw new Error(payload.error || 'บันทึกไม่สำเร็จ');
      setMessage(`บันทึก ${payload.link?.title_th || payload.link?.title || `TMDB ${editorForm.tmdb_id}`} แล้ว`);
      setEditorOpen(false);
      setEditorForm(emptyForm);
      setActiveReport(undefined);
      await loadDashboard(adminToken.trim());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    const ready = links.filter((item) => item.is_active && item.status === 'published' && item.watch_url).length;
    const missing = links.filter((item) => !item.watch_url).length;
    const review = links.filter((item) => item.status === 'review' || item.status === 'draft').length;
    const broken = links.filter((item) => item.status === 'broken').length + reports.filter((report) => report.status === 'pending').length;

    return [
      { label: 'ทั้งหมด', value: links.length ? String(links.length) : '1,240', helper: links.length ? 'รายการจริง' : 'ตัวอย่าง', tone: 'bg-[#e50914]' },
      { label: 'พร้อมดู', value: links.length ? String(ready) : '86', helper: 'มีลิงก์', tone: 'bg-[#f4c46b]' },
      { label: 'ยังไม่มี', value: links.length ? String(missing) : '12', helper: `${review} รอตรวจ`, tone: 'bg-white/18' },
      { label: 'ลิงก์เสีย', value: links.length || reports.length ? String(broken) : '14', helper: 'Report', tone: 'bg-red-500' },
    ];
  }, [links, reports]);

  const baseMissingCards = useMemo(() => {
    const source = links.length ? links.filter((item) => !item.watch_url || item.status === 'draft' || item.status === 'review') : fallbackMissing;
    return source.map((item) => toCard(item, 'missing'));
  }, [links]);

  const baseBrokenCards = useMemo(() => {
    const cards: AdminCard[] = [];
    const brokenLinks = links.length ? links.filter((item) => item.status === 'broken') : fallbackBroken;
    cards.push(...brokenLinks.map((item) => toCard(item, 'broken')));

    for (const report of reports) {
      const matched = links.find((item) => item.tmdb_id === report.tmdb_id && item.media_type === report.media_type);
      const item = matched || {
        id: '',
        tmdb_id: report.tmdb_id || 0,
        media_type: report.media_type,
        title: report.title || null,
        title_th: report.title_th || report.title || null,
        watch_url: report.url || null,
        trailer_url: null,
        provider: 'report',
        is_active: true,
        notes: report.detail || report.reason,
        section_slug: 'watch-ready',
        status: 'broken' as MovieStatus,
        created_at: report.created_at,
        updated_at: report.updated_at,
        rating: 0,
        year: report.created_at?.slice(0, 4),
        genres: [],
      };
      cards.push(toCard(item, 'broken', report));
    }

    return cards;
  }, [links, reports]);

  const missingCards = useMemo(() => sortCards(baseMissingCards.filter((card) => matchesFilter(card, activeFilter)), sortMode), [activeFilter, baseMissingCards, sortMode]);
  const brokenCards = useMemo(() => sortCards(baseBrokenCards.filter((card) => matchesFilter(card, activeFilter)), sortMode), [activeFilter, baseBrokenCards, sortMode]);

  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <section className="relative overflow-hidden px-4 py-8 md:px-8 md:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(229,9,20,0.24),transparent_30rem),radial-gradient(circle_at_82%_10%,rgba(244,196,107,0.12),transparent_24rem),linear-gradient(180deg,#050000,#030303)]" />
        <div className="relative z-10 mx-auto max-w-[1600px]">
          <a href="/" className="text-xs font-black text-red-200/70 hover:text-red-100">← กลับหน้าแรก</a>
          <p className="mt-7 text-[10px] font-black uppercase tracking-[0.34em] text-[#e50914] md:text-xs">DOFree Admin CMS</p>
          <h1 className="mt-3 max-w-4xl text-[42px] font-black leading-[0.9] tracking-[-0.08em] md:text-[76px]">จัดการหนังและลิงก์รับชม</h1>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/56 md:text-lg md:leading-8">
            โฟกัสงานจริงของแอดมิน: ใช้การ์ดแบบเดียวกับหน้าบ้าน แต่กดเข้าไปแก้ลิงก์ สถานะ และข้อมูลเผยแพร่ได้ทันที
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] space-y-6 px-4 pb-12 md:px-8">
        <div className="grid grid-cols-4 gap-2 overflow-hidden rounded-[22px] bg-white/[0.035] p-2 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          {stats.map((item) => (
            <article key={item.label} className="min-w-0 rounded-[16px] bg-black/24 p-2.5 md:p-3">
              <div className={`h-1 rounded-full ${item.tone}`} />
              <p className="mt-2 truncate text-[8px] font-black text-white/42 md:text-[10px]">{item.label}</p>
              <h2 className="mt-0.5 truncate text-lg font-black tracking-[-0.06em] md:text-3xl">{item.value}</h2>
              <p className="truncate text-[8px] font-semibold text-white/38 md:text-[10px]">{item.helper}</p>
            </article>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-white/[0.035] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-4">
          <div>
            <p className="text-xs font-black text-white/72">เพิ่มรายการใหม่แบบเร็ว</p>
            <p className="mt-1 text-[11px] font-semibold text-white/36">กดแล้วกรอก TMDB ID และลิงก์ใน modal เดียว</p>
          </div>
          <button type="button" onClick={() => openEditor()} className="h-11 rounded-2xl bg-[#e50914] px-5 text-xs font-black text-white shadow-glow">+ เพิ่มหนัง</button>
        </div>

        <AdminControls activeFilter={activeFilter} setActiveFilter={setActiveFilter} sortMode={sortMode} setSortMode={setSortMode} />

        <MovieGridSection
          eyebrow="Need Watch Link"
          title="หนังที่ยังไม่มีลิงก์หนัง"
          description="การ์ดใช้สไตล์เดียวกับหน้าบ้าน เรียงจากคะแนนมากสุดก่อนเสมอ แล้วค่อยกรองด้วยปุ่มด้านบน"
          cards={missingCards}
          visibleCount={missingVisible}
          onMore={() => setMissingVisible((count) => count + 12)}
          onOpen={(card) => openEditor(card.item, card.report)}
        />

        <MovieGridSection
          eyebrow="Broken Reports"
          title="หนังที่ถูกแจ้งว่าลิงก์เสีย"
          description="รวมรายการสถานะ Broken และ report จากผู้ใช้ คลิกการ์ดเพื่อเปลี่ยนลิงก์ใหม่หรือแก้สถานะกลับเป็น Published"
          cards={brokenCards}
          visibleCount={brokenVisible}
          onMore={() => setBrokenVisible((count) => count + 12)}
          onOpen={(card) => openEditor(card.item, card.report)}
        />

        <section className="rounded-[28px] bg-white/[0.035] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.72)] backdrop-blur-2xl md:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/38">Admin Access</p>
          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto] md:items-end">
            <label className="block">
              <FieldLabel>DOFREE_ADMIN_TOKEN</FieldLabel>
              <input value={adminToken} onChange={(event) => setAdminToken(event.target.value)} type="password" placeholder="ใส่ token เพื่อโหลดข้อมูลจริง" className={inputClass()} />
            </label>
            <button type="button" onClick={saveToken} disabled={loading} className="h-11 rounded-2xl bg-[#e50914] px-6 text-xs font-black text-white shadow-glow disabled:opacity-45">{loading ? 'กำลังโหลด' : 'เชื่อมข้อมูล'}</button>
            <button type="button" onClick={() => loadDashboard()} disabled={loading} className="h-11 rounded-2xl bg-white/[0.08] px-6 text-xs font-black text-white/70 disabled:opacity-45">รีเฟรช</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill active={Boolean(links.length)}>Supabase</StatusPill>
            <StatusPill active={Boolean(adminToken)}>Token</StatusPill>
            <StatusPill>TMDB Ready</StatusPill>
          </div>
          {message ? <p className="mt-3 rounded-xl bg-green-400/10 px-3 py-2 text-xs font-bold text-green-100">{message}</p> : null}
          {error ? <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100">{error}</p> : null}
        </section>
      </section>

      {editorOpen ? (
        <EditorModal
          form={editorForm}
          setForm={setEditorForm}
          saving={saving}
          onClose={() => { setEditorOpen(false); setActiveReport(undefined); }}
          onSubmit={saveEditor}
          report={activeReport}
        />
      ) : null}
    </main>
  );
}
