'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { MovieItem } from '@/lib/tmdb';
import { MovieCard } from '@/components/movie-card';

const modalTabs = [
  { id: 'cast', label: 'นักแสดง' },
  { id: 'detail', label: 'รายละเอียด' },
  { id: 'recommend', label: 'แนะนำ' },
  { id: 'spoiler', label: 'สปอยหนัง' },
] as const;

type ModalTab = (typeof modalTabs)[number]['id'] | 'watch';

type CastPerson = {
  id?: number;
  name: string;
  character?: string;
  profileUrl?: string;
  role?: string;
  initial?: string;
};

type DetailResponse = {
  item?: MovieItem;
  cast?: CastPerson[];
  trailerUrl?: string;
  recommendations?: MovieItem[];
  source?: 'tmdb' | 'fallback';
};

type PersonCreditsResponse = {
  person?: CastPerson;
  items?: MovieItem[];
};

type PlayerKind = 'iframe' | 'video' | 'empty' | 'unsupported';

type PlayerSource = {
  src?: string;
  kind: PlayerKind;
  note?: string;
};

function fallbackCast(item: MovieItem): CastPerson[] {
  const roles = item.mediaType === 'tv'
    ? ['นักแสดงนำซีรีส์', 'ตัวละครหลัก', 'นักแสดงสมทบ', 'แขกรับเชิญ', 'ตัวละครรอง', 'บทพิเศษ']
    : ['นักแสดงนำ', 'ตัวละครสำคัญ', 'นักแสดงสมทบ', 'บทบาทพิเศษ', 'ตัวละครรอง', 'นักแสดงรับเชิญ'];
  const genres = item.genres?.length ? item.genres : ['ภาพยนตร์'];

  return roles.map((role, index) => ({
    name: `นักแสดง ${String.fromCharCode(65 + index)}`,
    role: `${role} • ${genres[index % genres.length]}`,
    initial: String.fromCharCode(65 + index),
  }));
}

function personInitial(name?: string) {
  const trimmed = name?.trim();
  if (!trimmed) return '?';
  return trimmed.slice(0, 1).toUpperCase();
}

function appendQuery(url: string, params: Record<string, string>) {
  try {
    const parsed = new URL(url);
    for (const [key, value] of Object.entries(params)) {
      if (!parsed.searchParams.has(key)) parsed.searchParams.set(key, value);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function youtubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace('www.', '');

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname.startsWith('/embed/')) return appendQuery(url, { autoplay: '1', rel: '0', playsinline: '1' });
      if (parsed.pathname === '/watch') {
        const videoId = parsed.searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1` : undefined;
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        const videoId = parsed.pathname.split('/')[2];
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1` : undefined;
      }
    }

    if (host === 'youtu.be') {
      const videoId = parsed.pathname.replace('/', '');
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1` : undefined;
    }
  } catch {}

  return undefined;
}

function drivePreviewUrl(url: string) {
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (url.includes('drive.google.com') && openMatch?.[1]) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  return undefined;
}

function bunnyEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace('www.', '');
    if (!host.includes('mediadelivery.net')) return undefined;

    const parts = parsed.pathname.split('/').filter(Boolean);
    const type = parts[0];
    const libraryId = parts[1];
    const videoId = parts[2];

    if ((type === 'play' || type === 'embed') && libraryId && videoId) {
      return appendQuery(`https://iframe.mediadelivery.net/embed/${libraryId}/${videoId.split('?')[0]}`, {
        autoplay: 'false',
        loop: 'false',
        muted: 'false',
        preload: 'true',
        responsive: 'true',
      });
    }
  } catch {}

  return undefined;
}

function isDirectVideoUrl(url: string) {
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);
}

function isHlsUrl(url: string) {
  return /\.m3u8(\?|#|$)/i.test(url);
}

function playerSource(value?: string): PlayerSource {
  const url = value?.trim();
  if (!url || url.includes('youtube.com/results')) return { kind: 'empty' };

  const bunny = bunnyEmbedUrl(url);
  if (bunny) return { kind: 'iframe', src: bunny };

  const youtube = youtubeEmbedUrl(url);
  if (youtube) return { kind: 'iframe', src: youtube };

  const drive = drivePreviewUrl(url);
  if (drive) return { kind: 'iframe', src: drive };

  if (isDirectVideoUrl(url)) return { kind: 'video', src: url };
  if (isHlsUrl(url)) return { kind: 'unsupported', src: url, note: 'ลิงก์นี้เป็น HLS (.m3u8) ถ้าจะใช้โดยตรงต้องเพิ่ม hls.js หรือใช้ Bunny Embed URL แทน' };

  return { kind: 'iframe', src: url };
}

function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[22px] bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl ${className}`}>{children}</div>;
}

function PlayerEmpty({ title, fallbackImage, label }: { title: string; fallbackImage: string; label: string }) {
  return (
    <div className="relative grid aspect-video place-items-center overflow-hidden rounded-[20px] bg-black/58 text-center shadow-[0_24px_90px_rgba(0,0,0,0.72)] backdrop-blur-md md:rounded-[26px]">
      <img src={fallbackImage} alt={title} loading="lazy" decoding="async" sizes="(max-width: 768px) 92vw, 780px" className="absolute inset-0 h-full w-full object-cover opacity-25 blur-[1px]" />
      <div className="absolute inset-0 bg-black/62" />
      <div className="relative z-10 px-6">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/[0.1] text-xl font-black text-white/58 shadow-[0_18px_50px_rgba(0,0,0,0.72)] backdrop-blur-xl md:h-16 md:w-16 md:text-2xl">▶</div>
        <p className="mt-3 text-xs font-black text-white/72 md:text-sm">{label}</p>
      </div>
    </div>
  );
}

function InlinePlayer({ url, title, fallbackImage, emptyLabel }: { url?: string; title: string; fallbackImage: string; emptyLabel: string }) {
  const source = playerSource(url);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [source.src]);

  if (source.kind === 'empty' || !source.src) return <PlayerEmpty title={title} fallbackImage={fallbackImage} label={emptyLabel} />;

  if (source.kind === 'unsupported') {
    return (
      <div className="relative grid aspect-video place-items-center overflow-hidden rounded-[20px] bg-black p-5 text-center shadow-[0_24px_90px_rgba(0,0,0,0.72)] md:rounded-[26px]">
        <div>
          <p className="text-sm font-black text-white/78 md:text-base">ยังเล่นลิงก์นี้ใน Player นี้ไม่ได้</p>
          <p className="mt-2 text-xs font-bold leading-5 text-white/50 md:text-sm">{source.note}</p>
          <a href={source.src} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#e50914] px-4 text-xs font-black text-white">เปิดลิงก์โดยตรง</a>
        </div>
      </div>
    );
  }

  if (source.kind === 'video') {
    return (
      <div className="relative overflow-hidden rounded-[20px] bg-black shadow-[0_24px_90px_rgba(0,0,0,0.72)] md:rounded-[26px]">
        <video src={source.src} className="aspect-video w-full bg-black object-contain" controls playsInline preload="metadata" poster={fallbackImage} onError={() => setFailed(true)} />
        {failed ? <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-black/78 p-3 text-xs font-bold text-white/76 backdrop-blur-xl">วิดีโอโหลดไม่ได้จากลิงก์นี้ <a href={source.src} target="_blank" rel="noreferrer" className="font-black text-[#e50914]">เปิดลิงก์โดยตรง</a></div> : null}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[20px] bg-black shadow-[0_24px_90px_rgba(0,0,0,0.72)] md:rounded-[26px]">
      <iframe src={source.src} title={title} loading="eager" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="no-referrer-when-downgrade" className="aspect-video w-full border-0 bg-black" onError={() => setFailed(true)} />
      {failed ? <a href={source.src} target="_blank" rel="noreferrer" className="absolute right-3 top-3 rounded-xl bg-black/62 px-3 py-2 text-[11px] font-black text-white/85 backdrop-blur-xl">เปิดลิงก์</a> : null}
    </div>
  );
}

function ActorCard({ person, onSelect, selected }: { person: CastPerson; onSelect: (person: CastPerson) => void; selected: boolean }) {
  const canOpen = Boolean(person.id);
  return (
    <button type="button" onClick={() => canOpen && onSelect(person)} disabled={!canOpen} className={`group relative aspect-[2/3] min-w-0 overflow-hidden rounded-[12px] bg-white/[0.055] text-left shadow-[0_16px_54px_rgba(0,0,0,0.55)] backdrop-blur-xl transition duration-300 md:rounded-[16px] ${selected ? 'ring-1 ring-[#e50914]/80 shadow-glow' : 'hover:-translate-y-1 hover:bg-white/[0.085]'} ${canOpen ? '' : 'cursor-not-allowed opacity-60'}`} aria-label={`ดูผลงานของ ${person.name}`}>
      {person.profileUrl ? <img src={person.profileUrl} alt={person.name} loading="lazy" decoding="async" sizes="(max-width: 768px) 30vw, 140px" className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 group-hover:scale-110" /> : <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_24%,#8a111b,#111_62%)] text-4xl font-black text-white/78 md:text-5xl">{person.initial || personInitial(person.name)}</div>}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.06)_44%,rgba(0,0,0,0.92)_100%)]" />
      <div className="absolute left-1.5 top-1.5 rounded-md bg-[#e50914]/92 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_28px_rgba(229,9,20,0.38)] md:left-2.5 md:top-2.5 md:px-2 md:py-1 md:text-[9px]">ACTOR</div>
      <div className="absolute inset-x-0 bottom-0 p-2 md:p-3">
        <h4 className="line-clamp-2 text-[10px] font-black leading-tight text-white drop-shadow md:text-sm">{person.name}</h4>
        <p className="mt-1 line-clamp-2 text-[8px] font-bold leading-3 text-white/52 md:text-[10px] md:leading-4">{person.character || person.role || 'นักแสดง'}</p>
        {canOpen ? <p className="mt-1 text-[7px] font-black text-[#e50914] md:text-[9px]">กดดูผลงาน</p> : null}
      </div>
    </button>
  );
}

function StatusBadge({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return <span className={`rounded-full px-2 py-0.5 text-[9px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md md:text-[11px] ${active ? 'bg-[#e50914]/22 text-red-100' : 'bg-white/[0.105] text-white/78'}`}>{children}</span>;
}

export function SearchWindow({ query, setQuery, items, onClose, onSelect }: { query: string; setQuery: (value: string) => void; items: MovieItem[]; onClose: () => void; onSelect: (item: MovieItem) => void }) {
  const normalizedQuery = query.trim().toLowerCase();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return items;
    return items.filter((item) => [item.title, item.titleEn, item.year, item.mediaType, ...(item.genres || [])].join(' ').toLowerCase().includes(normalizedQuery));
  }, [items, normalizedQuery]);

  const visibleItems = filteredItems.slice(0, visibleCount);

  useEffect(() => setVisibleCount(24), [normalizedQuery]);
  useEffect(() => {
    if (visibleCount >= filteredItems.length || typeof IntersectionObserver === 'undefined') return;
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount((count) => Math.min(count + 24, filteredItems.length));
    }, { rootMargin: '520px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [filteredItems.length, visibleCount]);

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/88 px-3 py-4 text-white backdrop-blur-2xl" role="dialog" aria-modal="true">
      <div className="mx-auto max-w-4xl rounded-[28px] bg-[#050505]/92 p-4 shadow-[0_38px_120px_rgba(0,0,0,0.9)] backdrop-blur-2xl md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e50914]">DOFree Search</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.06em]">ค้นหาภาพยนตร์</h2>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.08] text-xl font-black text-white/80 shadow-[0_12px_36px_rgba(0,0,0,0.55)] backdrop-blur-xl hover:bg-white/[0.14]">×</button>
        </div>
        <label className="mt-4 flex h-11 items-center rounded-2xl bg-white/[0.08] px-4 backdrop-blur-xl">
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาภาพยนตร์, ซีรีส์, นักแสดง" className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/35" />
        </label>
        <div className="mt-4 grid grid-cols-4 gap-2.5 md:grid-cols-6">
          {visibleItems.map((item) => <MovieCard key={`search-${item.mediaType}-${item.id}`} item={item} grid onSelect={(nextItem) => { onClose(); onSelect(nextItem); }} />)}
        </div>
        {visibleItems.length < filteredItems.length ? <div ref={loadMoreRef} className="py-5 text-center text-[11px] font-black text-white/35">กำลังโหลดเพิ่ม...</div> : null}
      </div>
    </div>
  );
}

export function DetailWindow({ item, recommendations, onClose, onSelect }: { item: MovieItem; recommendations: MovieItem[]; onClose: () => void; onSelect: (item: MovieItem) => void }) {
  const [reported, setReported] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('cast');
  const [expanded, setExpanded] = useState(false);
  const [visibleRecCount, setVisibleRecCount] = useState(8);
  const [detailItem, setDetailItem] = useState<MovieItem>(item);
  const [realCast, setRealCast] = useState<CastPerson[]>([]);
  const [detailRecommendations, setDetailRecommendations] = useState<MovieItem[]>(recommendations);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<CastPerson | null>(null);
  const [personMovies, setPersonMovies] = useState<MovieItem[]>([]);
  const [personLoading, setPersonLoading] = useState(false);
  const recLoadRef = useRef<HTMLDivElement | null>(null);

  const displayItem = detailItem;
  const cast = realCast.length ? realCast : fallbackCast(displayItem);
  const visibleRecommendations = detailRecommendations.slice(0, visibleRecCount);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setActiveTab('cast');
    setExpanded(false);
    setReported(false);
    setVisibleRecCount(8);
    setDetailItem(item);
    setRealCast([]);
    setDetailRecommendations(recommendations);
    setSelectedPerson(null);
    setPersonMovies([]);
    setPersonLoading(false);
    setDetailLoading(true);

    async function loadDetail() {
      try {
        const response = await fetch(`/api/tmdb/detail?mediaType=${item.mediaType}&id=${item.id}`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) return;
        const payload = (await response.json()) as DetailResponse;
        if (cancelled) return;
        if (payload.item) setDetailItem(payload.item);
        setRealCast((payload.cast || []).filter((person) => person.name).slice(0, 18));
        setDetailRecommendations(payload.recommendations?.length ? payload.recommendations : recommendations);
      } catch {
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }

    loadDetail();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [item.id, item.mediaType, recommendations]);

  useEffect(() => {
    if (activeTab !== 'recommend' || visibleRecCount >= detailRecommendations.length || typeof IntersectionObserver === 'undefined') return;
    const node = recLoadRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleRecCount((count) => Math.min(count + 8, detailRecommendations.length));
    }, { rootMargin: '420px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [activeTab, detailRecommendations.length, visibleRecCount]);

  async function loadPersonMovies(person: CastPerson) {
    if (!person.id) return;
    setSelectedPerson(person);
    setPersonMovies([]);
    setPersonLoading(true);
    try {
      const response = await fetch(`/api/tmdb/person?id=${person.id}`, { cache: 'no-store' });
      if (!response.ok) return;
      const payload = (await response.json()) as PersonCreditsResponse;
      setPersonMovies((payload.items || []).slice(0, 36));
      if (payload.person) setSelectedPerson({ ...person, ...payload.person });
    } catch {
      setPersonMovies([]);
    } finally {
      setPersonLoading(false);
    }
  }

  async function reportIssue() {
    setReported(true);
    try {
      await fetch('/api/link-reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tmdb_id: displayItem.id, media_type: displayItem.mediaType, title: displayItem.title, reason: 'broken_link' }),
      });
    } catch {}
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[90] overflow-y-auto bg-black/70 px-2 py-4 text-white backdrop-blur-2xl md:bg-black/78 md:px-4 md:py-7" role="dialog" aria-modal="true">
      <div onClick={(event) => event.stopPropagation()} className="mx-auto w-full max-w-[860px] overflow-hidden rounded-[28px] bg-[#050505]/88 shadow-[0_42px_150px_rgba(0,0,0,0.94)] backdrop-blur-2xl md:rounded-[34px]">
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-white/16 md:hidden" />
        <div className="relative bg-black/42 shadow-[inset_0_-80px_110px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="absolute inset-0 bg-cover bg-center opacity-24 blur-[1px]" style={{ backgroundImage: `url(${displayItem.backdropUrl || displayItem.posterUrl})` }} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.42),rgba(5,5,5,0.86)_55%,rgba(5,5,5,0.98)_100%)] md:bg-[linear-gradient(90deg,rgba(5,5,5,0.98)_0%,rgba(5,5,5,0.86)_42%,rgba(5,5,5,0.48)_100%)]" />
          <button onClick={onClose} className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/62 text-xl font-black text-white/80 shadow-[0_14px_42px_rgba(0,0,0,0.72)] backdrop-blur-xl hover:bg-white/[0.12] md:right-4 md:top-4 md:h-11 md:w-11 md:text-2xl" aria-label="ปิดรายละเอียด">×</button>
          <div className="relative z-10 grid grid-cols-[88px_1fr] gap-3 p-4 pt-5 md:grid-cols-[118px_1fr] md:gap-4 md:p-5 md:pb-4">
            <div className="min-w-0">
              <div className="overflow-hidden rounded-[16px] bg-black/40 shadow-[0_20px_55px_rgba(0,0,0,0.75)] backdrop-blur-md md:rounded-[20px]">
                <img src={displayItem.posterUrl} alt={displayItem.title} loading="lazy" decoding="async" sizes="(max-width: 768px) 88px, 118px" className="h-[132px] w-full object-cover md:h-[176px]" />
              </div>
            </div>
            <div className="min-w-0 pr-9 md:pr-11">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#e50914] md:text-[10px] md:tracking-[0.24em]">{displayItem.mediaType === 'tv' ? 'Series' : 'Movie'}</p>
              <h2 className="modal-title mt-1.5 line-clamp-2 text-[21px] font-black leading-[0.98] tracking-[-0.06em] text-white md:text-[31px]">{displayItem.title}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-black md:text-[11px]">
                <StatusBadge>★ {displayItem.rating.toFixed(1)}</StatusBadge>
                <StatusBadge>{displayItem.year}</StatusBadge>
                <StatusBadge>{displayItem.language === 'th' ? 'TH' : displayItem.language || 'EN'}</StatusBadge>
                <StatusBadge active>{displayItem.watchUrl ? 'HD' : 'ZOOM'}</StatusBadge>
              </div>
              <p className={`${expanded ? '' : 'line-clamp-3'} mt-2 text-[11px] font-medium leading-4 text-white/58 md:text-[13px] md:leading-5`}>{displayItem.overview}</p>
              <button onClick={() => setExpanded((value) => !value)} className="mt-1 text-[10px] font-black text-red-200/80 hover:text-red-100 md:text-xs">{expanded ? 'ย่อ' : 'ดูเพิ่มเติม'}</button>
              <div className="mt-3 grid max-w-[310px] grid-cols-2 gap-2">
                <button onClick={() => displayItem.watchUrl && setActiveTab('watch')} disabled={!displayItem.watchUrl} className={`inline-flex h-10 items-center justify-center rounded-xl px-3 text-[11px] font-black shadow-[0_14px_36px_rgba(0,0,0,0.42)] backdrop-blur-xl md:h-11 md:text-xs ${displayItem.watchUrl ? 'bg-[#e50914] text-white shadow-[0_14px_36px_rgba(229,9,20,0.34)]' : 'cursor-not-allowed bg-white/[0.09] text-white/40'}`}>▶ รับชม</button>
                <button onClick={() => setActiveTab('recommend')} className="inline-flex h-10 items-center justify-center rounded-xl bg-white/[0.1] px-3 text-[11px] font-black text-white/82 shadow-[0_14px_36px_rgba(0,0,0,0.32)] backdrop-blur-xl hover:bg-white/[0.16] md:h-11 md:text-xs">+ รายการโปรด</button>
              </div>
            </div>
          </div>
          <div className="relative z-10 px-4 pb-4 md:px-5 md:pb-5">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-100/68 md:text-xs">TRAILER PREVIEW</p>
            <InlinePlayer url={displayItem.trailerUrl} title={`ตัวอย่าง ${displayItem.title}`} fallbackImage={displayItem.backdropUrl || displayItem.posterUrl} emptyLabel={detailLoading ? 'กำลังโหลดตัวอย่างจาก TMDB...' : 'ยังไม่มีตัวอย่างที่ฝังใน Modal ได้'} />
          </div>
        </div>
        <div className="sticky top-0 z-20 bg-black/62 px-3 shadow-[0_20px_60px_rgba(0,0,0,0.58)] backdrop-blur-2xl md:px-5">
          <div className="movie-rail flex gap-1 overflow-x-auto py-2.5 md:gap-1.5 md:py-3">
            {modalTabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`min-w-max rounded-md px-3 py-1.5 text-[10px] font-black transition shadow-[0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl md:px-4 md:py-2 md:text-xs ${activeTab === tab.id ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/55 hover:bg-white/[0.12] hover:text-white'}`}>{tab.label}</button>)}
          </div>
        </div>
        <div className="p-3 md:p-4">
          <Surface className="min-h-[320px] p-4 md:p-5">
            {activeTab === 'cast' && <div><div className="flex items-center justify-between gap-3"><div><h3 className="text-base font-black md:text-xl">{selectedPerson ? `ผลงานของ ${selectedPerson.name}` : 'นักแสดงหลัก'}</h3>{selectedPerson ? <p className="mt-1 text-[10px] font-bold text-white/42 md:text-xs">กดการ์ดหนังเพื่อเปิดรายละเอียดเรื่องนั้น</p> : null}</div>{selectedPerson ? <button onClick={() => { setSelectedPerson(null); setPersonMovies([]); }} className="rounded-full bg-white/[0.08] px-3 py-1 text-[10px] font-black text-white/68 shadow-[0_10px_28px_rgba(0,0,0,0.32)] backdrop-blur-xl hover:bg-white/[0.14] md:text-xs">กลับไปนักแสดง</button> : detailLoading ? <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-black text-white/38 backdrop-blur-xl">กำลังโหลด</span> : <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-black text-white/38 backdrop-blur-xl">{realCast.length ? 'TMDB' : 'สำรอง'}</span>}</div>{!selectedPerson ? <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-3">{cast.map((person, index) => <ActorCard key={`${person.id || person.name}-${index}`} person={person} selected={false} onSelect={loadPersonMovies} />)}</div> : personLoading ? <div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-3" aria-hidden="true">{Array.from({ length: 9 }).map((_, index) => <div key={index} className="aspect-[2/3] animate-pulse rounded-[12px] bg-white/[0.055] md:rounded-[16px]" />)}</div> : personMovies.length ? <div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-3">{personMovies.map((movie, index) => <MovieCard key={`actor-${selectedPerson.id}-${movie.mediaType}-${movie.id}-${index}`} item={movie} grid compact onSelect={(nextItem) => { onSelect(nextItem); setActiveTab('cast'); }} priorityBadge={index < 3 ? 'ผลงาน' : undefined} />)}</div> : <div className="mt-4 rounded-2xl bg-black/28 p-4 text-center text-xs font-bold text-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-xl md:text-sm">ยังไม่พบผลงานของนักแสดงคนนี้จาก TMDB</div>}</div>}
            {activeTab === 'detail' && <div><div className="flex items-center justify-between gap-3"><h3 className="text-base font-black md:text-xl">เกี่ยวกับภาพยนตร์</h3>{detailLoading ? <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-black text-white/38 backdrop-blur-xl">กำลังโหลด TMDB</span> : null}</div><div className="mt-3 grid gap-2 text-[11px] font-bold text-white/62 sm:grid-cols-2 md:mt-4 md:gap-3 md:text-sm"><p>ประเภท: {(displayItem.genres || []).join(', ') || 'ภาพยนตร์'}</p><p>ความยาว: {displayItem.runtime ? `${displayItem.runtime} นาที` : 'ยังไม่มีข้อมูล'}</p><p>วันฉาย: {displayItem.releaseDate || displayItem.year}</p><p>ภาษา: {displayItem.language === 'th' ? 'ไทย' : displayItem.language || 'ไม่ระบุ'}</p><p>สถานะ: {displayItem.watchUrl ? 'พร้อมรับชม' : displayItem.status || 'preview'}</p><p>คะแนน: {displayItem.rating.toFixed(1)} / 10</p></div><p className="mt-4 text-xs leading-5 text-white/58 md:text-sm md:leading-6">{displayItem.overview}</p></div>}
            {activeTab === 'recommend' && <div><h3 className="text-base font-black md:text-xl">แนะนำสำหรับคุณ</h3><div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-3">{visibleRecommendations.map((movie, index) => <MovieCard key={`modal-rec-${movie.mediaType}-${movie.id}-${index}`} item={movie} grid compact onSelect={(nextItem) => { onSelect(nextItem); setActiveTab('cast'); setExpanded(false); }} priorityBadge={index % 2 === 0 ? 'แนะนำ' : undefined} />)}</div>{visibleRecommendations.length < detailRecommendations.length ? <div ref={recLoadRef} className="py-4 text-center text-[10px] font-black text-white/35">กำลังโหลดเพิ่ม...</div> : null}</div>}
            {activeTab === 'spoiler' && <div><h3 className="text-base font-black md:text-xl">สปอยหนัง</h3><div className="mt-3 rounded-2xl bg-yellow-300/[0.08] p-3 text-xs leading-5 text-yellow-50/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl md:text-sm md:leading-6">{displayItem.overview}</div></div>}
            {activeTab === 'watch' && <div><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/70 md:text-xs">WATCH READY</p><h3 className="mt-1 text-lg font-black md:text-2xl">{displayItem.watchUrl ? 'รับชม' : 'ยังไม่มีลิงก์รับชม'}</h3></div></div><div className="mt-3"><InlinePlayer url={displayItem.watchUrl} title={`รับชม ${displayItem.title}`} fallbackImage={displayItem.backdropUrl || displayItem.posterUrl} emptyLabel="ยังไม่มีลิงก์รับชม" /></div><div className="mt-3 flex justify-end"><button onClick={reportIssue} className="h-9 rounded-xl bg-black/35 px-4 text-xs font-black text-white/70 shadow-[0_12px_34px_rgba(0,0,0,0.32)] backdrop-blur-xl md:h-10">แจ้งลิงก์เสีย</button></div>{reported ? <p className="mt-3 rounded-2xl bg-green-400/[0.09] p-3 text-xs font-bold text-green-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl md:text-sm">รับรายงานแล้ว ทีมแอดมินจะตรวจสอบลิงก์นี้</p> : null}</div>}
          </Surface>
        </div>
      </div>
    </div>
  );
}
