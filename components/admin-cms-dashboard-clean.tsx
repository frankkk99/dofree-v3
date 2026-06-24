'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

type MediaType = 'movie' | 'tv';
type MovieStatus = 'draft' | 'review' | 'published' | 'broken' | 'hidden';
type AdminFilter = 'all' | 'missing' | 'broken' | 'movie' | 'series' | 'thai' | 'hd' | 'zoom' | 'top-rated' | 'ready' | 'draft-review';
type AdminSort = 'rating' | 'updated';

type AdminMovieLink = {
  id?: string;
  tmdb_id: number;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  is_active?: boolean;
  notes?: string | null;
  section_slug?: string;
  status?: MovieStatus;
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
  reason?: string | null;
  detail?: string | null;
  status?: string;
  created_at?: string;
};

type AdminPayload = {
  ok: boolean;
  links?: AdminMovieLink[];
  reports?: LinkReport[];
  error?: string;
  link?: AdminMovieLink;
};

type AdminCardTone = 'missing' | 'broken' | 'ready' | 'draft';
type AdminCard = {
  key: string;
  tone: AdminCardTone;
  item: AdminMovieLink;
  report?: LinkReport;
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
  runtime: string;
  genres: string;
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
  runtime: '',
  genres: '',
};

const filterButtons: { id: AdminFilter; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'missing', label: 'ไม่มีลิงก์รับชม' },
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

function fieldClass() {
  return 'mt-2 h-11 w-full rounded-2xl bg-white/[0.075] px-4 text-sm font-bold text-white outline-none ring-1 ring-white/[0.06] transition placeholder:text-white/24 focus:bg-white/[0.105] focus:ring-[#e50914]/60';
}

function areaClass() {
  return 'mt-2 min-h-[86px] w-full resize-none rounded-2xl bg-white/[0.075] px-4 py-3 text-sm font-bold leading-6 text-white outline-none ring-1 ring-white/[0.06] transition placeholder:text-white/24 focus:bg-white/[0.105] focus:ring-[#e50914]/60';
}

function titleOf(item: AdminMovieLink) {
  return item.title_th || item.title || '';
}

function hasWatchLink(item: AdminMovieLink) {
  return Boolean(item.watch_url?.trim());
}

function hasDisplayData(item: AdminMovieLink) {
  return Boolean(item.poster_url && titleOf(item).trim() && item.tmdb_id);
}

function scoreOf(item: AdminMovieLink) {
  return Number(item.rating || 0);
}

function yearOf(item: AdminMovieLink) {
  return item.year || item.created_at?.slice(0, 4) || '2026';
}

function toneOf(item: AdminMovieLink): AdminCardTone {
  if (item.status === 'broken') return 'broken';
  if (!hasWatchLink(item)) return 'missing';
  if (item.status === 'draft' || item.status === 'review') return 'draft';
  return 'ready';
}

function badgesOf(item: AdminMovieLink, tone: AdminCardTone) {
  const badges = [tone === 'broken' ? 'ลิงก์เสีย' : !hasWatchLink(item) ? 'ไม่มีรับชม' : 'พร้อมดู'];
  if (scoreOf(item) >= 8) badges.push('8+');
  if (hasWatchLink(item)) badges.push('HD');
  if (item.status === 'review') badges.push('ZOOM');
  if (item.language === 'th') badges.push('ไทย');
  return badges.slice(0, 2);
}

function toCard(item: AdminMovieLink, tone: AdminCardTone = toneOf(item), report?: LinkReport): AdminCard {
  return {
    key: `${tone}-${item.id || item.tmdb_id}-${report?.id || ''}`,
    tone,
    item,
    report,
  };
}

function itemToForm(item: AdminMovieLink): EditorForm {
  return {
    id: item.id || '',
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
    runtime: item.runtime ? String(item.runtime) : '',
    genres: item.genres?.join(', ') || '',
  };
}

function formPreview(form: EditorForm): AdminMovieLink {
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
    section_slug: form.section_slug,
    status: form.status,
    poster_url: form.poster_url || null,
    backdrop_url: form.backdrop_url || null,
    rating: Number(form.rating || 0),
    year: form.year || undefined,
    language: form.language || undefined,
    runtime: Number(form.runtime || 0) || null,
    genres: form.genres.split(',').map((genre) => genre.trim()).filter(Boolean),
  };
}

function cardText(card: AdminCard) {
  const item = card.item;
  return [
    titleOf(item),
    item.title,
    item.title_th,
    item.tmdb_id,
    item.media_type,
    item.status,
    item.section_slug,
    item.language,
    item.year,
    item.provider,
    item.notes,
    item.genres?.join(' '),
    card.report?.reason,
    card.report?.detail,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function matchesSearch(card: AdminCard, query: string) {
  const keyword = query.trim().toLowerCase();
  return keyword ? cardText(card).includes(keyword) : true;
}

function matchesFilter(card: AdminCard, activeFilter: AdminFilter) {
  const item = card.item;
  if (activeFilter === 'all') return true;
  if (activeFilter === 'missing') return !hasWatchLink(item);
  if (activeFilter === 'broken') return card.tone === 'broken' || item.status === 'broken';
  if (activeFilter === 'draft-review') return item.status === 'draft' || item.status === 'review';
  if (activeFilter === 'movie') return item.media_type === 'movie';
  if (activeFilter === 'series') return item.media_type === 'tv';
  if (activeFilter === 'thai') return item.language === 'th' || item.section_slug === 'thai' || Boolean(item.genres?.some((genre) => genre.includes('ไทย')));
  if (activeFilter === 'top-rated') return scoreOf(item) >= 8;
  if (activeFilter === 'hd') return hasWatchLink(item);
  if (activeFilter === 'zoom') return item.status === 'review' || item.notes?.toLowerCase().includes('zoom');
  if (activeFilter === 'ready') return hasWatchLink(item) && item.status === 'published';
  return true;
}

function sortCards(cards: AdminCard[], sortMode: AdminSort) {
  return [...cards].sort((a, b) => {
    if (sortMode === 'updated') {
      return new Date(b.item.updated_at || b.item.created_at || 0).getTime() - new Date(a.item.updated_at || a.item.created_at || 0).getTime();
    }
    return scoreOf(b.item) - scoreOf(a.item);
  });
}

function AdminPosterCard({ card, onOpen }: { card: AdminCard; onOpen: (card: AdminCard) => void }) {
  const item = card.item;
  if (!hasDisplayData(item)) return null;

  return (
    <button
      type="button"
      onClick={() => onOpen(card)}
      className="group relative aspect-[2/3] min-w-0 overflow-hidden rounded-[10px] bg-[#111] text-left shadow-[0_16px_44px_rgba(0,0,0,0.62)] transition duration-300 hover:-translate-y-1 hover:shadow-glow md:rounded-[12px] md:shadow-[0_24px_70px_rgba(0,0,0,0.65)]"
      aria-label={`แก้ไข ${titleOf(item)}`}
    >
      <img src={item.poster_url || ''} alt={titleOf(item)} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 group-hover:scale-110" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06)_0%,rgba(0,0,0,0.0)_40%,rgba(0,0,0,0.94)_100%)]" />
      <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1 pr-1 md:left-3 md:top-3 md:gap-1.5 md:pr-2">
        {badgesOf(item, card.tone).map((badge) => (
          <span key={badge} className={`${badge === 'ลิงก์เสีย' ? 'bg-red-600 text-white' : badge === 'ไม่มีรับชม' ? 'bg-[#f4c46b] text-black' : 'bg-[#e50914] text-white'} rounded px-1.5 py-0.5 text-[7px] font-black shadow-lg backdrop-blur-md md:rounded-md md:px-2 md:py-1 md:text-[10px]`}>
            {badge}
          </span>
        ))}
      </div>
      <div className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/48 text-[10px] font-black text-white/72 opacity-0 shadow-xl backdrop-blur-xl transition group-hover:opacity-100 md:right-3 md:top-3 md:h-8 md:w-8 md:text-xs">แก้</div>
      <div className="absolute inset-x-0 bottom-0 p-2 md:p-3.5">
        <div className="mb-1 flex items-center gap-1 text-[7px] font-black uppercase tracking-[0.1em] text-white/38 md:mb-2 md:gap-2 md:text-[10px] md:tracking-[0.16em]">
          <span>{item.media_type === 'tv' ? 'Series' : 'Movie'}</span>
          <span>•</span>
          <span>{item.status || 'draft'}</span>
        </div>
        <h3 className="line-clamp-2 text-[9px] font-black leading-tight text-white drop-shadow sm:text-[11px] md:text-[15px]">{titleOf(item)}</h3>
        <div className="mt-1 flex items-center gap-1 text-[8px] font-bold text-white/58 md:mt-2 md:gap-2 md:text-[11px]">
          <span className="text-[#f4c46b]">★ {scoreOf(item).toFixed(1)}</span>
          <span>•</span>
          <span>{yearOf(item)}</span>
        </div>
      </div>
    </button>
  );
}

function StatsBar({ items }: { items: { label: string; value: string; tone: string }[] }) {
  return (
    <div className="grid grid-cols-4 gap-1.5 rounded-[20px] bg-white/[0.035] p-2 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:gap-2">
      {items.map((item) => (
        <article key={item.label} className="min-w-0 rounded-[14px] bg-black/24 p-2 md:p-3">
          <div className={`h-1 rounded-full ${item.tone}`} />
          <p className="mt-2 truncate text-[8px] font-black text-white/42 md:text-[10px]">{item.label}</p>
          <h2 className="mt-0.5 truncate text-lg font-black tracking-[-0.06em] md:text-3xl">{item.value}</h2>
        </article>
      ))}
    </div>
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
      <div className="flex gap-2">
        <button type="button" onClick={() => setSortMode('rating')} className={`h-8 rounded-full px-3 text-[10px] font-black ${sortMode === 'rating' ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/58'}`}>คะแนนสูงสุด</button>
        <button type="button" onClick={() => setSortMode('updated')} className={`h-8 rounded-full px-3 text-[10px] font-black ${sortMode === 'updated' ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/58'}`}>อัปเดตล่าสุด</button>
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

function MovieGridSection({ title, cards, visibleCount, onMore, onOpen }: {
  title: string;
  cards: AdminCard[];
  visibleCount: number;
  onMore: () => void;
  onOpen: (card: AdminCard) => void;
}) {
  const visibleCards = cards.slice(0, visibleCount);
  return (
    <section className="rounded-[30px] bg-white/[0.026] p-4 shadow-[0_26px_90px_rgba(0,0,0,0.48)] backdrop-blur-2xl md:p-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-black tracking-[-0.06em] md:text-4xl">
          {title} <span className="text-[#e50914]">{cards.length}</span>
        </h2>
        <span className="rounded-full bg-[#e50914] px-3 py-1 text-[10px] font-black text-white shadow-glow">{cards.length}</span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-4 xl:gap-5">
        {visibleCards.map((card) => <AdminPosterCard key={card.key} card={card} onOpen={onOpen} />)}
      </div>
      {!visibleCards.length ? <div className="mt-5 rounded-[24px] bg-black/24 p-8 text-center text-sm font-black text-white/58 shadow-inner">ยังไม่มีรายการ</div> : null}
      {visibleCount < cards.length ? (
        <div className="mt-5 text-center">
          <button type="button" onClick={onMore} className="h-11 rounded-2xl bg-white/[0.08] px-6 text-xs font-black text-white/70 shadow-[0_14px_40px_rgba(0,0,0,0.42)] transition hover:bg-white/[0.12] hover:text-white">
            ดูเพิ่มเติมอีก {Math.min(9, cards.length - visibleCount)} รายการ
          </button>
        </div>
      ) : null}
    </section>
  );
}

function FloatingSearch({ value, onChange, resultCount }: { value: string; onChange: (value: string) => void; resultCount: number }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4">
      <div className="pointer-events-auto mx-auto flex max-w-[620px] items-center gap-2 rounded-full bg-black/54 p-2 shadow-[0_24px_90px_rgba(0,0,0,0.78)] ring-1 ring-white/[0.08] backdrop-blur-2xl">
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="ค้นหาหนังทั้งหมด" className="min-w-0 flex-1 bg-transparent px-4 text-sm font-black text-white outline-none placeholder:text-white/35" />
        {value ? <span className="hidden rounded-full bg-white/[0.08] px-3 py-2 text-[10px] font-black text-white/58 sm:inline-flex">{resultCount} ผลลัพธ์</span> : null}
        {value ? <button type="button" onClick={() => onChange('')} className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.08] text-lg font-black text-white/70">×</button> : null}
      </div>
    </div>
  );
}

function EditorModal({ form, setForm, saving, report, onClose, onSubmit }: {
  form: EditorForm;
  setForm: (form: EditorForm) => void;
  saving: boolean;
  report?: LinkReport;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const preview = formPreview(form);
  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/72 px-3 py-6 text-white backdrop-blur-2xl md:px-6" role="dialog" aria-modal="true">
      <form onSubmit={onSubmit} className="mx-auto max-w-[1040px] overflow-hidden rounded-[34px] bg-[#050505]/92 shadow-[0_44px_160px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
        <section className="relative overflow-hidden p-4 md:p-6">
          {preview.backdrop_url ? <div className="absolute inset-0 bg-cover bg-center opacity-24" style={{ backgroundImage: `url(${preview.backdrop_url})` }} /> : null}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_14%,rgba(229,9,20,0.32),transparent_24rem),linear-gradient(180deg,rgba(0,0,0,0.18),#050505)]" />
          <button type="button" onClick={onClose} className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/42 text-2xl font-black text-white/70 shadow-[0_14px_50px_rgba(0,0,0,0.72)] backdrop-blur-xl hover:bg-white/10 hover:text-white">×</button>
          <div className="relative z-10 flex flex-col gap-5 md:flex-row">
            <div className="relative h-[190px] w-[128px] shrink-0 overflow-hidden rounded-[22px] bg-[radial-gradient(circle_at_45%_20%,rgba(229,9,20,0.7),rgba(18,18,18,0.95)_68%)] shadow-[0_28px_80px_rgba(0,0,0,0.72)]">
              {preview.poster_url ? <img src={preview.poster_url} alt={titleOf(preview)} className="absolute inset-0 h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1 pt-1 md:pr-14">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">Admin Movie Editor</p>
              <h2 className="mt-2 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-6xl">{preview.title_th || preview.title || 'เพิ่ม / แก้ไขหนัง'}</h2>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black text-white/64">
                <span className="rounded-full bg-white/[0.08] px-3 py-1">TMDB {preview.tmdb_id || '-'}</span>
                <span className="rounded-full bg-white/[0.08] px-3 py-1">{preview.media_type === 'tv' ? 'Series' : 'Movie'}</span>
                <span className="rounded-full bg-white/[0.08] px-3 py-1">{preview.status}</span>
                <span className="rounded-full bg-white/[0.08] px-3 py-1">★ {scoreOf(preview).toFixed(1)}</span>
              </div>
              {report ? <div className="mt-4 rounded-2xl bg-red-500/10 p-3 text-xs font-bold leading-5 text-red-100">{report.reason || 'รายงานลิงก์เสีย'} {report.detail ? `• ${report.detail}` : ''}</div> : null}
            </div>
          </div>
        </section>

        <section className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
          <label><span className="text-xs font-black text-white/48">TMDB ID</span><input value={form.tmdb_id} onChange={(event) => setForm({ ...form, tmdb_id: event.target.value })} className={fieldClass()} /></label>
          <label><span className="text-xs font-black text-white/48">ประเภท</span><select value={form.media_type} onChange={(event) => setForm({ ...form, media_type: event.target.value as MediaType })} className={fieldClass()}><option value="movie">Movie</option><option value="tv">Series</option></select></label>
          <label><span className="text-xs font-black text-white/48">ชื่ออังกฤษ</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={fieldClass()} /></label>
          <label><span className="text-xs font-black text-white/48">ชื่อไทย</span><input value={form.title_th} onChange={(event) => setForm({ ...form, title_th: event.target.value })} className={fieldClass()} /></label>
          <label className="md:col-span-2"><span className="text-xs font-black text-white/48">ลิงก์หน้า รับชม</span><input value={form.watch_url} onChange={(event) => setForm({ ...form, watch_url: event.target.value })} placeholder="Google Drive / video URL" className={fieldClass()} /></label>
          <label><span className="text-xs font-black text-white/48">ลิงก์ตัวอย่าง</span><input value={form.trailer_url} onChange={(event) => setForm({ ...form, trailer_url: event.target.value })} className={fieldClass()} /></label>
          <label><span className="text-xs font-black text-white/48">หมวด</span><select value={form.section_slug} onChange={(event) => setForm({ ...form, section_slug: event.target.value })} className={fieldClass()}><option value="watch-ready">Watch Ready</option><option value="now-playing">มาใหม่</option><option value="popular">ยอดนิยม</option><option value="thai">หนังไทย</option></select></label>
          <label><span className="text-xs font-black text-white/48">สถานะ</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as MovieStatus })} className={fieldClass()}><option value="draft">Draft</option><option value="review">Review / ZOOM</option><option value="published">Published</option><option value="broken">Broken</option><option value="hidden">Hidden</option></select></label>
          <label><span className="text-xs font-black text-white/48">Provider</span><input value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} className={fieldClass()} /></label>
          <label><span className="text-xs font-black text-white/48">Poster URL</span><input value={form.poster_url} onChange={(event) => setForm({ ...form, poster_url: event.target.value })} className={fieldClass()} /></label>
          <label><span className="text-xs font-black text-white/48">Backdrop URL</span><input value={form.backdrop_url} onChange={(event) => setForm({ ...form, backdrop_url: event.target.value })} className={fieldClass()} /></label>
          <label><span className="text-xs font-black text-white/48">คะแนน</span><input value={form.rating} onChange={(event) => setForm({ ...form, rating: event.target.value })} className={fieldClass()} /></label>
          <label><span className="text-xs font-black text-white/48">ปี</span><input value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} className={fieldClass()} /></label>
          <label><span className="text-xs font-black text-white/48">ภาษา</span><input value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })} className={fieldClass()} /></label>
          <label><span className="text-xs font-black text-white/48">Genres</span><input value={form.genres} onChange={(event) => setForm({ ...form, genres: event.target.value })} className={fieldClass()} /></label>
          <label className="md:col-span-2"><span className="text-xs font-black text-white/48">หมายเหตุ</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={areaClass()} /></label>
        </section>

        <div className="sticky bottom-0 flex justify-end gap-3 bg-black/58 p-4 shadow-[0_-20px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl md:p-5">
          <button type="button" onClick={onClose} className="h-11 rounded-2xl bg-white/[0.08] px-6 text-xs font-black text-white/70">ยกเลิก</button>
          <button type="submit" disabled={saving} className="h-11 rounded-2xl bg-[#e50914] px-7 text-xs font-black text-white shadow-glow disabled:opacity-50">{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
        </div>
      </form>
    </div>
  );
}

export function AdminCmsDashboardClean() {
  const [adminToken, setAdminToken] = useState('');
  const [links, setLinks] = useState<AdminMovieLink[]>([]);
  const [reports, setReports] = useState<LinkReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missingVisible, setMissingVisible] = useState(9);
  const [brokenVisible, setBrokenVisible] = useState(9);
  const [searchVisible, setSearchVisible] = useState(9);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorForm, setEditorForm] = useState<EditorForm>(emptyForm);
  const [activeReport, setActiveReport] = useState<LinkReport | undefined>();
  const [activeFilter, setActiveFilter] = useState<AdminFilter>('all');
  const [sortMode, setSortMode] = useState<AdminSort>('rating');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const savedToken = window.localStorage.getItem('dofree_admin_token') || '';
    if (savedToken) {
      setAdminToken(savedToken);
      void loadDashboard(savedToken);
    }
  }, []);

  useEffect(() => {
    setSearchVisible(9);
  }, [searchQuery]);

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
      setMessage('โหลดข้อมูลแล้ว');
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
        body: JSON.stringify({
          ...editorForm,
          tmdb_id: Number(editorForm.tmdb_id),
        }),
      });
      const payload = (await response.json()) as AdminPayload;
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

  const allCards = useMemo(() => {
    const cards = links.map((item) => toCard(item));
    for (const report of reports) {
      const matched = links.find((item) => item.tmdb_id === report.tmdb_id && item.media_type === report.media_type);
      if (matched) cards.push(toCard(matched, 'broken', report));
    }
    return cards;
  }, [links, reports]);

  const displayCards = useMemo(() => allCards.filter((card) => hasDisplayData(card.item)), [allCards]);
  const missingCards = useMemo(() => sortCards(displayCards.filter((card) => !hasWatchLink(card.item) && matchesFilter(card, activeFilter)), sortMode), [activeFilter, displayCards, sortMode]);
  const brokenCards = useMemo(() => sortCards(displayCards.filter((card) => (card.tone === 'broken' || card.item.status === 'broken') && matchesFilter(card, activeFilter)), sortMode), [activeFilter, displayCards, sortMode]);
  const searchCards = useMemo(() => sortCards(displayCards.filter((card) => matchesSearch(card, searchQuery)), sortMode), [displayCards, searchQuery, sortMode]);
  const isSearching = Boolean(searchQuery.trim());

  const stats = useMemo(() => {
    const uniqueDisplay = new Map(displayCards.map((card) => [`${card.item.media_type}-${card.item.tmdb_id}`, card.item]));
    const uniqueItems = [...uniqueDisplay.values()];
    return [
      { label: 'ทั้งหมด', value: String(uniqueItems.length), tone: 'bg-[#e50914]' },
      { label: 'พร้อมดู', value: String(uniqueItems.filter((item) => hasWatchLink(item) && item.status === 'published').length), tone: 'bg-[#f4c46b]' },
      { label: 'ไม่มีรับชม', value: String(uniqueItems.filter((item) => !hasWatchLink(item)).length), tone: 'bg-white/18' },
      { label: 'ลิงก์เสีย', value: String(displayCards.filter((card) => card.tone === 'broken' || card.item.status === 'broken').length), tone: 'bg-red-500' },
    ];
  }, [displayCards]);

  return (
    <main className="min-h-screen bg-[#030303] pb-28 text-white">
      <section className="relative overflow-hidden px-4 py-8 md:px-8 md:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(229,9,20,0.24),transparent_30rem),radial-gradient(circle_at_82%_10%,rgba(244,196,107,0.12),transparent_24rem),linear-gradient(180deg,#050000,#030303)]" />
        <div className="relative z-10 mx-auto max-w-[1600px]">
          <a href="/" className="text-xs font-black text-red-200/70 hover:text-red-100">← กลับหน้าแรก</a>
          <p className="mt-7 text-[10px] font-black uppercase tracking-[0.34em] text-[#e50914] md:text-xs">DOFree Admin CMS</p>
          <h1 className="mt-3 max-w-4xl text-[42px] font-black leading-[0.9] tracking-[-0.08em] md:text-[76px]">จัดการหนังและลิงก์รับชม</h1>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] space-y-6 px-4 pb-12 md:px-8">
        <StatsBar items={stats} />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-white/[0.035] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-4">
          <p className="text-xs font-black text-white/72">เพิ่มรายการใหม่</p>
          <button type="button" onClick={() => openEditor()} className="h-11 rounded-2xl bg-[#e50914] px-5 text-xs font-black text-white shadow-glow">+ เพิ่มหนัง</button>
        </div>

        <AdminControls activeFilter={activeFilter} setActiveFilter={setActiveFilter} sortMode={sortMode} setSortMode={setSortMode} />

        {isSearching ? (
          <MovieGridSection title="ผลค้นหา" cards={searchCards} visibleCount={searchVisible} onMore={() => setSearchVisible((count) => count + 9)} onOpen={(card) => openEditor(card.item, card.report)} />
        ) : (
          <>
            <MovieGridSection title="หนังที่ยังไม่มีลิงก์รับชม" cards={missingCards} visibleCount={missingVisible} onMore={() => setMissingVisible((count) => count + 9)} onOpen={(card) => openEditor(card.item, card.report)} />
            <MovieGridSection title="หนังที่ถูกแจ้งว่าลิงก์เสีย" cards={brokenCards} visibleCount={brokenVisible} onMore={() => setBrokenVisible((count) => count + 9)} onOpen={(card) => openEditor(card.item, card.report)} />
          </>
        )}

        <section className="rounded-[28px] bg-white/[0.035] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.72)] backdrop-blur-2xl md:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/38">Admin Access</p>
          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto] md:items-end">
            <label className="block">
              <span className="text-xs font-black text-white/48">DOFREE_ADMIN_TOKEN</span>
              <input value={adminToken} onChange={(event) => setAdminToken(event.target.value)} placeholder="ใส่ token เพื่อโหลดข้อมูลจริง" className={fieldClass()} />
            </label>
            <button type="button" onClick={saveToken} disabled={loading} className="h-11 rounded-2xl bg-[#e50914] px-6 text-xs font-black text-white shadow-glow disabled:opacity-45">{loading ? 'กำลังโหลด' : 'เชื่อมข้อมูล'}</button>
            <button type="button" onClick={() => loadDashboard()} disabled={loading} className="h-11 rounded-2xl bg-white/[0.08] px-6 text-xs font-black text-white/70 disabled:opacity-45">รีเฟรช</button>
          </div>
          {message ? <p className="mt-3 rounded-xl bg-green-400/10 px-3 py-2 text-xs font-bold text-green-100">{message}</p> : null}
          {error ? <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100">{error}</p> : null}
        </section>
      </section>

      <FloatingSearch value={searchQuery} onChange={setSearchQuery} resultCount={searchCards.length} />

      {editorOpen ? (
        <EditorModal
          form={editorForm}
          setForm={setEditorForm}
          saving={saving}
          report={activeReport}
          onClose={() => { setEditorOpen(false); setActiveReport(undefined); }}
          onSubmit={saveEditor}
        />
      ) : null}
    </main>
  );
}
