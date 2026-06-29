'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { adminSessionHeaders } from '@/lib/admin-session-browser';
import { adminInputClassSm, adminSelectClassSm } from '@/lib/admin-ui-classes';

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

type SeriesEpisode = {
  id?: string;
  tmdb_id: number;
  season_number: number;
  episode_number: number;
  episode_title?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  notes?: string | null;
  status?: Status;
};

type EpisodeForm = {
  season_number: string;
  episode_number: string;
  episode_title: string;
  watch_url: string;
  trailer_url: string;
  provider: string;
  notes: string;
  status: Status;
};

type EpisodeDraft = {
  season_number: number;
  episode_number: number;
  episode_title: string;
  watch_url: string;
  trailer_url: string;
  provider: string;
  notes: string;
  status: Status;
};

type EpisodeDraftRow = EpisodeDraft & {
  draft_key: string;
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
const cls = adminInputClassSm;
const selectCls = adminSelectClassSm;
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

function emptyEpisodeForm(provider = 'bunny'): EpisodeForm {
  return {
    season_number: '1',
    episode_number: '1',
    episode_title: '',
    watch_url: '',
    trailer_url: '',
    provider,
    notes: '',
    status: 'published',
  };
}

function episodeToForm(episode: SeriesEpisode): EpisodeForm {
  return {
    season_number: String(episode.season_number || 1),
    episode_number: String(episode.episode_number || 1),
    episode_title: episode.episode_title || '',
    watch_url: episode.watch_url || '',
    trailer_url: episode.trailer_url || '',
    provider: episode.provider || 'bunny',
    notes: episode.notes || '',
    status: episode.status || 'published',
  };
}

function draftToForm(episode: EpisodeDraft): EpisodeForm {
  return {
    season_number: String(episode.season_number || 1),
    episode_number: String(episode.episode_number || 1),
    episode_title: episode.episode_title || '',
    watch_url: episode.watch_url || '',
    trailer_url: episode.trailer_url || '',
    provider: episode.provider || 'bunny',
    notes: episode.notes || '',
    status: episode.status || 'published',
  };
}

function formToDraft(form: EpisodeForm): EpisodeDraft {
  const watchUrl = form.watch_url.trim();
  return {
    season_number: Number(form.season_number) || 1,
    episode_number: Number(form.episode_number) || 1,
    episode_title: form.episode_title || `EP ${form.episode_number || 1}`,
    watch_url: watchUrl,
    trailer_url: form.trailer_url.trim(),
    provider: form.provider || 'admin',
    notes: form.notes,
    status: watchUrl && form.status === 'draft' ? 'published' : form.status,
  };
}

function episodeRowKey(episode: Pick<SeriesEpisode, 'id' | 'season_number' | 'episode_number'>) {
  return episode.id ? `episode-${episode.id}` : `episode-${episode.season_number}-${episode.episode_number}`;
}

function episodeStatusMeta(episode: Pick<SeriesEpisode, 'watch_url' | 'status'> | EpisodeDraft) {
  if (episode.status === 'broken') return { label: 'Broken', className: 'bg-[#e50914]/18 text-red-100 ring-[#e50914]/30' };
  if (episode.status === 'hidden') return { label: 'Hidden', className: 'bg-white/[0.06] text-white/42 ring-white/10' };
  if (episode.status === 'review') return { label: 'Review', className: 'bg-[#f4c46b]/16 text-[#f4c46b] ring-[#f4c46b]/25' };
  if (episode.watch_url && episode.status === 'published') return { label: 'Ready', className: 'bg-emerald-400/16 text-emerald-100 ring-emerald-300/25' };
  return { label: episode.watch_url ? 'Draft' : 'Empty', className: 'bg-white/[0.08] text-white/50 ring-white/10' };
}

function sortedEpisodes<T extends { season_number: number; episode_number: number }>(items: T[]) {
  return [...items].sort((a, b) => a.season_number - b.season_number || a.episode_number - b.episode_number);
}

function nextEpisodeDrafts(episodes: SeriesEpisode[], drafts: EpisodeDraftRow[], count: number, provider: string): EpisodeDraftRow[] {
  const rows = [...episodes, ...drafts];
  const latestSeason = rows.length ? Math.max(...rows.map((episode) => Number(episode.season_number) || 1)) : 1;
  const latestEpisode = rows
    .filter((episode) => Number(episode.season_number) === latestSeason)
    .reduce((max, episode) => Math.max(max, Number(episode.episode_number) || 0), 0);
  return Array.from({ length: count }, (_, index) => {
    const episodeNumber = latestEpisode + index + 1;
    return {
      draft_key: `draft-${latestSeason}-${episodeNumber}-${Date.now()}-${index}`,
      season_number: latestSeason,
      episode_number: episodeNumber,
      episode_title: `EP ${episodeNumber}`,
      watch_url: '',
      trailer_url: '',
      provider: provider || 'admin',
      notes: '',
      status: 'draft',
    };
  });
}

function mergeEpisodeDrafts(...groups: EpisodeDraft[][]) {
  const seen = new Set<string>();
  return groups.flat().filter((episode) => {
    const key = `${episode.season_number}-${episode.episode_number}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function openTestUrl(url?: string | null) {
  const value = url?.trim();
  if (!value) return;
  window.open(value, '_blank', 'noopener,noreferrer');
}

async function copyUrl(url?: string | null) {
  const value = url?.trim();
  if (!value || !navigator.clipboard) return;
  await navigator.clipboard.writeText(value);
}

function parseEpisodeLine(line: string, index: number, provider: string): EpisodeDraft | null {
  const raw = line.trim();
  if (!raw) return null;
  const parts = raw.split('|').map((part) => part.trim());
  const first = parts[0] || '';
  const seasonEpisode = first.match(/^s?(\d+)\s*e(\d+)$/i);
  let seasonNumber = 1;
  let episodeNumber = index + 1;
  let titleIndex = 0;

  if (seasonEpisode) {
    seasonNumber = Number(seasonEpisode[1]);
    episodeNumber = Number(seasonEpisode[2]);
    titleIndex = 1;
  } else if (parts.length >= 3 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
    seasonNumber = Number(parts[0]);
    episodeNumber = Number(parts[1]);
    titleIndex = 2;
  } else if (/^\d+$/.test(parts[0])) {
    episodeNumber = Number(parts[0]);
    titleIndex = 1;
  }

  const title = parts[titleIndex] || `EP ${episodeNumber}`;
  const watchUrl = parts[titleIndex + 1] || (raw.startsWith('http') ? raw : '');
  const trailerUrl = parts[titleIndex + 2] || '';
  const nextProvider = parts[titleIndex + 3] || provider || 'admin';
  const status = (parts[titleIndex + 4] as Status) || (watchUrl ? 'published' : 'draft');
  const notes = parts.slice(titleIndex + 5).join(' | ');

  if (!Number.isInteger(seasonNumber) || seasonNumber <= 0 || !Number.isInteger(episodeNumber) || episodeNumber <= 0) return null;

  return {
    season_number: seasonNumber,
    episode_number: episodeNumber,
    episode_title: title,
    watch_url: watchUrl,
    trailer_url: trailerUrl,
    provider: nextProvider,
    notes,
    status: ['draft', 'review', 'published', 'broken', 'hidden'].includes(status) ? status : watchUrl ? 'published' : 'draft',
  };
}

function parseEpisodeBulk(text: string, provider: string) {
  const seen = new Set<string>();
  return text
    .split(/\r?\n/)
    .map((line, index) => parseEpisodeLine(line, index, provider))
    .filter((episode): episode is EpisodeDraft => Boolean(episode))
    .filter((episode) => {
      const key = `${episode.season_number}-${episode.episode_number}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function statusLabel(item: Item) {
  if (item.watch_url) return 'พร้อมดู';
  if (item.status === 'broken') return 'ลิงก์เสีย';
  if (item.status === 'hidden') return 'ซ่อน';
  if (item.status === 'review') return 'รอตรวจ';
  return 'ไม่มีลิงก์';
}

function UrlInputRow({
  label,
  value,
  onChange,
  onClear,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder: string;
}) {
  const hasValue = Boolean(value.trim());

  return (
    <label className="grid gap-1">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/36">{label}</span>
      <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={cls} />
        <button type="button" onClick={() => openTestUrl(value)} disabled={!hasValue} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-35">Test</button>
        <button type="button" onClick={() => void copyUrl(value)} disabled={!hasValue} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-35">Copy</button>
        <button type="button" onClick={onClear} disabled={!hasValue} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-35">Clear</button>
      </div>
    </label>
  );
}

function Edit({
  item,
  form,
  setForm,
  onClose,
  onSave,
  saving,
  episodes,
  episodeForm,
  setEpisodeForm,
  episodeDraftRows,
  allEpisodeDrafts,
  expandedEpisodeKey,
  onAddEpisodeDrafts,
  onSaveEpisode,
  onSaveBulkEpisodes,
  episodeSaving,
  episodeLoading,
  onEditEpisode,
  onEditEpisodeDraft,
  onUpdateEpisodeDraft,
  onCancelEpisodeEdit,
}: {
  item: Item;
  form: Form;
  setForm: (form: Form) => void;
  onClose: () => void;
  onSave: (event: FormEvent) => void;
  saving: boolean;
  episodes: SeriesEpisode[];
  episodeForm: EpisodeForm;
  setEpisodeForm: (form: EpisodeForm) => void;
  episodeDraftRows: EpisodeDraftRow[];
  allEpisodeDrafts: EpisodeDraft[];
  expandedEpisodeKey: string;
  onAddEpisodeDrafts: (count: number) => void;
  onSaveEpisode: () => void;
  onSaveBulkEpisodes: () => void;
  episodeSaving: boolean;
  episodeLoading: boolean;
  onEditEpisode: (episode: SeriesEpisode) => void;
  onEditEpisodeDraft: (episode: EpisodeDraftRow) => void;
  onUpdateEpisodeDraft: (key: string, form: EpisodeForm) => void;
  onCancelEpisodeEdit: () => void;
}) {
  const episodeRows = [
    ...sortedEpisodes(episodes).map((episode) => ({ kind: 'saved' as const, key: episodeRowKey(episode), episode })),
    ...sortedEpisodes(episodeDraftRows).map((episode) => ({ kind: 'draft' as const, key: episode.draft_key, episode })),
  ];
  const currentSeason = episodeRows[0]?.episode.season_number || 1;
  const hasUnsaved = Boolean(expandedEpisodeKey || episodeDraftRows.length);

  function handleClose() {
    if (hasUnsaved && !window.confirm('มีข้อมูลที่ยังไม่ได้บันทึก ต้องการปิดหน้าต่างนี้หรือไม่?')) return;
    onClose();
  }

  function updateEpisodeForm(next: EpisodeForm) {
    setEpisodeForm(next);
    if (expandedEpisodeKey.startsWith('draft-')) onUpdateEpisodeDraft(expandedEpisodeKey, next);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-2 text-white backdrop-blur-xl md:p-4">
      <form onSubmit={onSave} className="mx-auto flex max-h-[calc(100dvh-16px)] w-[calc(100vw-16px)] max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#060606] shadow-[0_20px_90px_rgba(0,0,0,0.72)] md:rounded-3xl">
        <div className="shrink-0 border-b border-white/10 p-3 md:p-5">
        <div className="flex gap-3">
          <img src={item.poster_url || ''} alt={name(item)} className="h-24 w-16 rounded-xl bg-white/10 object-cover md:h-40 md:w-28" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-[#e50914]">EDIT MOVIE</p>
            <h2 className="mt-1 truncate text-xl font-black leading-tight md:mt-2 md:text-3xl">{form.title_th || form.title || name(item)}</h2>
            <p className="mt-2 text-xs text-white/50">TMDB {item.tmdb_id} • {item.media_type} • ★ {Number(item.rating || 0).toFixed(1)} • {item.year || '-'}</p>
            <p className="mt-1 truncate text-xs text-white/36">{item.genres?.join(' / ') || item.section_slug || '-'}</p>
            <p className="mt-1 truncate text-xs text-white/30">Bucket: {item.source_buckets?.join(' / ') || item.source_bucket || '-'}</p>
          </div>
          <button type="button" onClick={handleClose} className="h-10 w-10 rounded-full bg-white/10 text-xl">×</button>
        </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-5">
        <div className="grid gap-3">
          <UrlInputRow
            label="Watch URL / Embed URL / HLS URL"
            value={form.watch_url}
            onChange={(value) => setForm({ ...form, watch_url: value, status: value.trim() ? 'published' : form.status })}
            onClear={() => setForm({ ...form, watch_url: '', status: 'draft' })}
            placeholder="ลิงก์รับชม"
          />
          <UrlInputRow
            label="Trailer URL"
            value={form.trailer_url}
            onChange={(value) => setForm({ ...form, trailer_url: value })}
            onClear={() => setForm({ ...form, trailer_url: '' })}
            placeholder="Trailer URL"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <input value={form.title_th} onChange={(event) => setForm({ ...form, title_th: event.target.value })} placeholder="ชื่อไทย" className={cls} />
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="ชื่ออังกฤษ" className={cls} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <select value={form.section_slug} onChange={(event) => setForm({ ...form, section_slug: event.target.value })} className={selectCls}>
              {sections.map((section) => <option key={section} value={section}>{section}</option>)}
            </select>
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Status })} className={selectCls}>
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

        {item.media_type === 'tv' ? (
          <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.045] p-3 md:p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#e50914]">Series Episodes</p>
                <h3 className="mt-1 text-xl font-black">จัดการซีซัน / ตอน</h3>
                <p className="mt-1 text-xs font-bold text-white/38">เพิ่มลิงก์รับชมเป็นรายตอน แล้วหน้าเล่นจะมีตัวเลือกตอนให้อัตโนมัติ</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white/60">{episodeLoading ? 'Loading...' : `${episodes.length} episodes`}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => onAddEpisodeDrafts(1)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/15">+ เพิ่มตอน</button>
              <button type="button" onClick={() => onAddEpisodeDrafts(5)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/15">+ เพิ่ม 5 ตอน</button>
              <button type="button" onClick={() => onAddEpisodeDrafts(10)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/15">+ เพิ่ม 10 ตอน</button>
              <button type="button" onClick={onSaveBulkEpisodes} disabled={episodeSaving || !allEpisodeDrafts.length} className="rounded-xl bg-[#e50914] px-4 py-2 text-xs font-black text-white disabled:opacity-45 md:ml-auto">
                {episodeSaving ? 'Saving...' : `บันทึกทั้งหมด ${allEpisodeDrafts.length}`}
              </button>
            </div>

            {hasUnsaved ? <p className="mt-3 rounded-xl border border-[#f4c46b]/20 bg-[#f4c46b]/10 px-3 py-2 text-xs font-black text-[#f4c46b]">มีข้อมูลที่ยังไม่ได้บันทึก</p> : null}

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/24">
              <div className="grid grid-cols-[72px_1fr_88px_92px_92px_120px] gap-2 border-b border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/36 max-lg:hidden">
                <span>EP</span>
                <span>Title</span>
                <span>Status</span>
                <span>Watch</span>
                <span>Trailer</span>
                <span>Action</span>
              </div>
              <div className="divide-y divide-white/8">
                {episodeRows.map((row) => {
                  const statusMeta = episodeStatusMeta(row.episode);
                  const watchReady = Boolean(row.episode.watch_url?.trim());
                  const trailerReady = Boolean(row.episode.trailer_url?.trim());
                  const isOpen = expandedEpisodeKey === row.key;
                  return (
                    <div key={row.key} className="bg-black/10">
                      <div className="grid gap-2 px-3 py-3 lg:grid-cols-[72px_1fr_88px_92px_92px_120px] lg:items-center">
                        <div className="text-sm font-black text-white">S{row.episode.season_number}E{String(row.episode.episode_number).padStart(2, '0')}</div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white/88">{row.episode.episode_title || `EP ${row.episode.episode_number}`}</p>
                          {row.kind === 'draft' ? <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#f4c46b]">Draft row</p> : null}
                        </div>
                        <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${statusMeta.className}`}>{statusMeta.label}</span>
                        <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-black ${watchReady ? 'bg-emerald-400/16 text-emerald-100' : 'bg-white/[0.07] text-white/42'}`}>{watchReady ? 'Watch' : 'Empty'}</span>
                        <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-black ${trailerReady ? 'bg-sky-400/16 text-sky-100' : 'bg-white/[0.07] text-white/42'}`}>{trailerReady ? 'Trailer' : 'Empty'}</span>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => openTestUrl(row.episode.watch_url)} disabled={!watchReady} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[10px] font-black text-white disabled:opacity-35">Test</button>
                          <button type="button" onClick={() => row.kind === 'draft' ? onEditEpisodeDraft(row.episode) : onEditEpisode(row.episode)} className="rounded-lg bg-[#e50914] px-2.5 py-1.5 text-[10px] font-black text-white">{watchReady ? 'แก้' : 'ใส่ลิงก์'}</button>
                        </div>
                      </div>

                      {isOpen ? (
                        <div className="border-t border-white/8 bg-black/28 p-3">
                          <div className="grid gap-3 md:grid-cols-[90px_90px_1fr]">
                            <input value={episodeForm.season_number} onChange={(event) => updateEpisodeForm({ ...episodeForm, season_number: event.target.value })} placeholder="Season" inputMode="numeric" className={cls} />
                            <input value={episodeForm.episode_number} onChange={(event) => updateEpisodeForm({ ...episodeForm, episode_number: event.target.value })} placeholder="Episode" inputMode="numeric" className={cls} />
                            <input value={episodeForm.episode_title} onChange={(event) => updateEpisodeForm({ ...episodeForm, episode_title: event.target.value })} placeholder="ชื่อตอน เช่น ตอนที่ 1" className={cls} />
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <UrlInputRow label="Episode Watch URL" value={episodeForm.watch_url} onChange={(value) => updateEpisodeForm({ ...episodeForm, watch_url: value, status: value.trim() ? (episodeForm.status === 'draft' ? 'published' : episodeForm.status) : 'draft' })} onClear={() => updateEpisodeForm({ ...episodeForm, watch_url: '', status: 'draft' })} placeholder="Episode Watch URL" />
                            <UrlInputRow label="Episode Trailer URL" value={episodeForm.trailer_url} onChange={(value) => updateEpisodeForm({ ...episodeForm, trailer_url: value })} onClear={() => updateEpisodeForm({ ...episodeForm, trailer_url: '' })} placeholder="Episode Trailer URL" />
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr_150px]">
                            <input value={episodeForm.provider} onChange={(event) => updateEpisodeForm({ ...episodeForm, provider: event.target.value })} placeholder="provider" className={cls} />
                            <input value={episodeForm.notes} onChange={(event) => updateEpisodeForm({ ...episodeForm, notes: event.target.value })} placeholder="หมายเหตุของตอนนี้" className={cls} />
                            <select value={episodeForm.status} onChange={(event) => updateEpisodeForm({ ...episodeForm, status: event.target.value as Status })} className={selectCls}>
                              <option value="draft">draft</option>
                              <option value="review">review</option>
                              <option value="published">published</option>
                              <option value="broken">broken</option>
                              <option value="hidden">hidden</option>
                            </select>
                          </div>
                          <div className="mt-3 flex flex-wrap justify-end gap-2">
                            <button type="button" onClick={onCancelEpisodeEdit} className="rounded-xl bg-white/10 px-4 py-2 text-xs font-black text-white">ยกเลิก</button>
                            <button type="button" onClick={onSaveEpisode} disabled={episodeSaving} className="rounded-xl bg-[#e50914] px-4 py-2 text-xs font-black text-white disabled:opacity-50">{episodeSaving ? 'Saving...' : 'บันทึกตอนนี้'}</button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                {!episodeRows.length ? (
                  <div className="px-3 py-8 text-center text-xs font-black text-white/38">ยังไม่มีตอน กด + เพิ่มตอน เพื่อเริ่มที่ S1E1</div>
                ) : null}
              </div>
            </div>

            {false && episodes.length ? (
              <div className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto pr-1">
                {episodes.map((episode) => (
                  <button key={`${episode.season_number}-${episode.episode_number}`} type="button" onClick={() => onEditEpisode(episode)} className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[11px] font-black text-white/68 hover:border-[#e50914]/60 hover:text-white">
                    S{episode.season_number} E{episode.episode_number}{episode.episode_title ? ` · ${episode.episode_title}` : ''}
                  </button>
                ))}
              </div>
            ) : (
              <p className="hidden mt-3 rounded-xl bg-black/28 px-3 py-2 text-xs font-bold text-white/36">ยังไม่มีตอนในระบบ เริ่มจาก S1 E1 ได้เลย</p>
            )}

            <details className="hidden mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
              <summary className="cursor-pointer text-sm font-black text-white/76">แก้ทีละตอน</summary>
              <div className="mt-3 grid gap-3 md:grid-cols-[90px_90px_1fr]">
                <input value={episodeForm.season_number} onChange={(event) => setEpisodeForm({ ...episodeForm, season_number: event.target.value })} placeholder="Season" inputMode="numeric" className={cls} />
                <input value={episodeForm.episode_number} onChange={(event) => setEpisodeForm({ ...episodeForm, episode_number: event.target.value })} placeholder="Episode" inputMode="numeric" className={cls} />
                <input value={episodeForm.episode_title} onChange={(event) => setEpisodeForm({ ...episodeForm, episode_title: event.target.value })} placeholder="ชื่อตอน เช่น ตอนที่ 1" className={cls} />
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_150px]">
                <input value={episodeForm.watch_url} onChange={(event) => setEpisodeForm({ ...episodeForm, watch_url: event.target.value, status: event.target.value.trim() ? 'published' : episodeForm.status })} placeholder="Episode Watch URL" className={cls} />
                <input value={episodeForm.trailer_url} onChange={(event) => setEpisodeForm({ ...episodeForm, trailer_url: event.target.value })} placeholder="Episode Trailer URL" className={cls} />
                <select value={episodeForm.status} onChange={(event) => setEpisodeForm({ ...episodeForm, status: event.target.value as Status })} className={selectCls}>
                  <option value="draft">draft</option>
                  <option value="review">review</option>
                  <option value="published">published</option>
                  <option value="broken">broken</option>
                  <option value="hidden">hidden</option>
                </select>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr_auto]">
                <input value={episodeForm.provider} onChange={(event) => setEpisodeForm({ ...episodeForm, provider: event.target.value })} placeholder="provider" className={cls} />
                <input value={episodeForm.notes} onChange={(event) => setEpisodeForm({ ...episodeForm, notes: event.target.value })} placeholder="หมายเหตุของตอนนี้" className={cls} />
                <button type="button" onClick={onSaveEpisode} disabled={episodeSaving} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{episodeSaving ? 'Saving...' : 'บันทึกตอนเดียว'}</button>
              </div>
            </details>
          </section>
        ) : null}

        </div>
        <div className="shrink-0 border-t border-white/10 p-3 md:p-5">
        <div className="flex flex-wrap justify-end gap-2">
          <a href={form.watch_url || '#'} target="_blank" rel="noreferrer" className={`rounded-xl bg-white/10 px-4 py-2 text-sm ${form.watch_url ? '' : 'pointer-events-none opacity-40'}`}>เปิด Preview</a>
          <button type="button" onClick={() => setForm({ ...form, watch_url: '', status: 'draft' })} className="rounded-xl bg-white/10 px-4 py-2 text-sm">ล้างลิงก์</button>
          <button type="button" onClick={handleClose} className="rounded-xl bg-white/10 px-4 py-2 text-sm">ยกเลิก</button>
          <button disabled={saving} className="rounded-xl bg-[#e50914] px-5 py-2 text-sm font-black disabled:opacity-50">{saving ? 'กำลังบันทึก' : 'บันทึก'}</button>
        </div>
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
  const [episodeSaving, setEpisodeSaving] = useState(false);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [active, setActive] = useState<Item | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [episodes, setEpisodes] = useState<SeriesEpisode[]>([]);
  const [episodeForm, setEpisodeForm] = useState<EpisodeForm>(emptyEpisodeForm());
  const [episodeDraftRows, setEpisodeDraftRows] = useState<EpisodeDraftRow[]>([]);
  const [expandedEpisodeKey, setExpandedEpisodeKey] = useState('');

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

  const allEpisodeDrafts = episodeDraftRows;

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

  async function loadEpisodes(item: Item) {
    if (item.media_type !== 'tv') {
      setEpisodes([]);
      return;
    }

    setEpisodeLoading(true);
    try {
      const response = await fetch(`/api/admin/series-episodes?tmdbId=${item.tmdb_id}`, {
        headers: adminSessionHeaders(),
        cache: 'no-store',
      });
      const data = (await response.json()) as { ok?: boolean; episodes?: SeriesEpisode[]; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || 'Load episodes failed');
      setEpisodes(data.episodes || []);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Load episodes failed');
      setEpisodes([]);
    } finally {
      setEpisodeLoading(false);
    }
  }

  async function saveEpisode() {
    if (!active || active.media_type !== 'tv') return;

    setEpisodeSaving(true);
    setErr('');
    try {
      const response = await fetch('/api/admin/series-episodes', {
        method: 'POST',
        headers: adminSessionHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          tmdb_id: active.tmdb_id,
          season_number: Number(episodeForm.season_number),
          episode_number: Number(episodeForm.episode_number),
          episode_title: episodeForm.episode_title,
          watch_url: episodeForm.watch_url,
          trailer_url: episodeForm.trailer_url,
          provider: episodeForm.provider,
          notes: episodeForm.notes,
          status: episodeForm.status,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || 'Save episode failed');
      setMsg(`บันทึก S${episodeForm.season_number} E${episodeForm.episode_number} แล้ว`);
      setEpisodeDraftRows((current) => current.filter((episode) => (
        episode.season_number !== Number(episodeForm.season_number) || episode.episode_number !== Number(episodeForm.episode_number)
      )));
      setExpandedEpisodeKey('');
      setEpisodeForm(emptyEpisodeForm(form?.provider || 'bunny'));
      await loadEpisodes(active);
      await load(0, false);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Save episode failed');
    } finally {
      setEpisodeSaving(false);
    }
  }

  async function saveBulkEpisodes() {
    if (!active || active.media_type !== 'tv' || !allEpisodeDrafts.length) return;

    setEpisodeSaving(true);
    setErr('');
    try {
      const response = await fetch('/api/admin/series-episodes', {
        method: 'POST',
        headers: adminSessionHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          tmdb_id: active.tmdb_id,
          episodes: allEpisodeDrafts.map((episode) => ({
            ...episode,
            tmdb_id: active.tmdb_id,
          })),
        }),
      });
      const data = (await response.json()) as { ok?: boolean; saved?: number; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || 'Save episodes failed');
      setMsg(`บันทึก ${data.saved || allEpisodeDrafts.length} ตอนแล้ว`);
      setEpisodeDraftRows([]);
      setExpandedEpisodeKey('');
      await loadEpisodes(active);
      await load(0, false);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Save episodes failed');
    } finally {
      setEpisodeSaving(false);
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
    setEpisodeForm(emptyEpisodeForm(item.provider || 'bunny'));
    setEpisodeDraftRows([]);
    setExpandedEpisodeKey('');
    void loadEpisodes(item);
  }

  function editEpisode(episode: SeriesEpisode) {
    setEpisodeForm(episodeToForm(episode));
    setExpandedEpisodeKey(episodeRowKey(episode));
  }

  function editEpisodeDraft(episode: EpisodeDraftRow) {
    setEpisodeForm(draftToForm(episode));
    setExpandedEpisodeKey(episode.draft_key);
  }

  function updateEpisodeDraft(key: string, nextForm: EpisodeForm) {
    setEpisodeDraftRows((current) => current.map((episode) => (
      episode.draft_key === key ? { ...formToDraft(nextForm), draft_key: key } : episode
    )));
  }

  function addEpisodeDrafts(count: number) {
    const drafts = nextEpisodeDrafts(episodes, episodeDraftRows, count, form?.provider || 'admin');
    setEpisodeDraftRows((current) => [...current, ...drafts]);
    if (drafts[0]) {
      setEpisodeForm(draftToForm(drafts[0]));
      setExpandedEpisodeKey(drafts[0].draft_key);
    }
  }

  function cancelEpisodeEdit() {
    setExpandedEpisodeKey('');
    setEpisodeForm(emptyEpisodeForm(form?.provider || 'bunny'));
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
    <section className="bg-[#030303] px-4 py-5 text-white md:px-8 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 md:hidden">
        <a href="/" className="text-xs text-red-200/70">← กลับหน้าแรก</a>
        <div className="flex flex-wrap gap-2">
          <a href="/admin" className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white/70">Dashboard</a>
          <a href="/admin/users" className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white/70">Users</a>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-2 md:mt-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-[-0.04em] md:text-4xl">Content</h1>
          <p className="mt-1 text-sm font-semibold text-white/42">จัดการหนัง ซีรีส์ และลิงก์</p>
        </div>
        <button type="button" onClick={clearFilters} className="rounded-xl bg-white/[0.08] px-4 py-2 text-sm font-black text-white/70">รีเซ็ตตัวกรอง</button>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); void load(0, false); }} className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <div className="grid gap-2 md:grid-cols-[1.4fr_140px_140px_auto]">
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="ค้นหาหนัง / ซีรีส์ / TMDB ID / ปี / ภาษา / หมายเหตุ" className={cls} />
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={selectCls}>{options.statuses.map((item) => <option key={item} value={item}>{optionLabel(item, 'status')}</option>)}</select>
          <select value={media} onChange={(event) => setMedia(event.target.value)} className={selectCls}>{options.media.map((item) => <option key={item} value={item}>{optionLabel(item, 'media')}</option>)}</select>
          <button type="submit" disabled={loading} className="rounded-xl bg-[#e50914] px-4 py-2 font-black disabled:opacity-50">{loading ? 'โหลด' : 'ค้นหา'}</button>
        </div>

        <details className="mt-2 rounded-xl border border-white/10 bg-black/20 p-2 md:open">
          <summary className="cursor-pointer px-1 text-xs font-black text-white/60">ตัวกรองเพิ่มเติม</summary>
          <div className="mt-2 grid gap-2 md:grid-cols-[120px_140px_140px_140px_140px_140px_120px_120px]">
            <select value={genre} onChange={(event) => setGenre(event.target.value)} className={selectCls}>{options.genres.map((item) => <option key={item} value={item}>{optionLabel(item)}</option>)}</select>
            <select value={source} onChange={(event) => setSource(event.target.value)} className={selectCls}>{options.sources.map((item) => <option key={item} value={item}>{optionLabel(item)}</option>)}</select>
            <select value={year} onChange={(event) => setYear(event.target.value)} className={selectCls}>{options.years.map((item) => <option key={item} value={item}>{item === 'all' ? 'ทุกปี' : item}</option>)}</select>
            <select value={month} onChange={(event) => setMonth(event.target.value)} className={selectCls}>{options.months.map((item) => <option key={item} value={item}>{optionLabel(item, 'month')}</option>)}</select>
            <select value={language} onChange={(event) => setLanguage(event.target.value)} className={selectCls}>{options.languages.map((item) => <option key={item} value={item}>{item === 'all' ? 'ทุกภาษา' : item}</option>)}</select>
            <select value={provider} onChange={(event) => setProvider(event.target.value)} className={selectCls}>{options.providers.map((item) => <option key={item} value={item}>{item === 'all' ? 'ทุก provider' : item}</option>)}</select>
            <select value={section} onChange={(event) => setSection(event.target.value)} className={selectCls}>{options.sections.map((item) => <option key={item} value={item}>{item === 'all' ? 'ทุก section' : item}</option>)}</select>
            <select value={poster} onChange={(event) => setPoster(event.target.value)} className={selectCls}>{options.posters.map((item) => <option key={item} value={item}>{optionLabel(item, 'poster')}</option>)}</select>
            <input value={minRating} onChange={(event) => setMinRating(event.target.value)} placeholder="คะแนนต่ำสุด" className={cls} inputMode="decimal" />
            <input value={maxRating} onChange={(event) => setMaxRating(event.target.value)} placeholder="คะแนนสูงสุด" className={cls} inputMode="decimal" />
          </div>

        <div className="mt-2 grid gap-2 md:grid-cols-[160px_160px_1fr_auto_auto]">
          <select value={sort} onChange={(event) => setSort(event.target.value)} className={selectCls}>
            <option value="rating">คะแนนสูง</option>
            <option value="newest">หนังใหม่</option>
            <option value="oldest">เก่าสุด</option>
            <option value="popular">ยอดนิยม</option>
            <option value="updated">อัปเดตล่าสุด</option>
            <option value="title">เรียงชื่อ</option>
          </select>
          <select value={view} onChange={(event) => setView(event.target.value)} className={selectCls}>
            <option value="unique">Unique movie</option>
            <option value="rows">ทุกแถว sync</option>
          </select>
          <div className="hidden md:block" />
          <button type="button" onClick={() => exportCatalog('filtered')} disabled={exporting} className="rounded-xl bg-white/[0.10] px-4 py-2 font-black text-white disabled:opacity-50">{exporting ? 'Export...' : 'Export ตามกรอง'}</button>
          <button type="button" onClick={() => exportCatalog('all')} disabled={exporting} className="rounded-xl bg-[#f4c46b] px-4 py-2 font-black text-black disabled:opacity-50">Export ทั้งหมด</button>
        </div>
        </details>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map((preset, index) => (
          <button key={preset.label} type="button" onClick={() => applyPreset(preset)} className={`rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-black text-white/66 hover:bg-white/[0.12] hover:text-white ${index > 5 ? 'max-md:hidden' : ''}`}>
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

      {active && form ? (
        <Edit
          item={active}
          form={form}
          setForm={setForm}
          onClose={() => { setActive(null); setForm(null); setEpisodes([]); setEpisodeDraftRows([]); setExpandedEpisodeKey(''); }}
          onSave={save}
          saving={saving}
          episodes={episodes}
          episodeForm={episodeForm}
          setEpisodeForm={setEpisodeForm}
          episodeDraftRows={episodeDraftRows}
          allEpisodeDrafts={allEpisodeDrafts}
          expandedEpisodeKey={expandedEpisodeKey}
          onAddEpisodeDrafts={addEpisodeDrafts}
          onSaveEpisode={saveEpisode}
          onSaveBulkEpisodes={saveBulkEpisodes}
          episodeSaving={episodeSaving}
          episodeLoading={episodeLoading}
          onEditEpisode={editEpisode}
          onEditEpisodeDraft={editEpisodeDraft}
          onUpdateEpisodeDraft={updateEpisodeDraft}
          onCancelEpisodeEdit={cancelEpisodeEdit}
        />
      ) : null}
    </section>
  );
}
