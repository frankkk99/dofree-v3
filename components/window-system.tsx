'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { MovieItem } from '@/lib/tmdb';
import { MovieCard } from '@/components/movie-card';
import { canUsePremiumFeature } from '@/lib/premium-access-config';
import { usePremiumAccessSnapshot } from '@/lib/premium-access-client';

const modalTabs = [
  { id: 'recommend', label: 'แนะนำ' },
  { id: 'cast', label: 'นักแสดง' },
  { id: 'detail', label: 'รายละเอียด' },
  { id: 'spoiler', label: 'เรื่องย่อ' },
] as const;

const MODAL_REC_BATCH_SIZE = 6;
const MODAL_REC_LOAD_THRESHOLD = 260;

type ModalTab = (typeof modalTabs)[number]['id'];

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
};

type PublicEpisode = {
  seasonNumber: number;
  episodeNumber: number;
  title?: string | null;
  href: string;
};

type PlayerKind = 'iframe' | 'video' | 'empty' | 'unsupported';

type PlayerSource = {
  src?: string;
  kind: PlayerKind;
  note?: string;
};

function appendQuery(url: string, params: Record<string, string>) {
  try {
    const parsed = new URL(url);
    for (const [key, value] of Object.entries(params)) parsed.searchParams.set(key, value);
    return parsed.toString();
  } catch {
    return url;
  }
}

function youtubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace('www.', '');
    const params = { autoplay: '0', rel: '0', playsinline: '1' };

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname.startsWith('/embed/')) return appendQuery(url, params);
      if (parsed.pathname === '/watch') {
        const videoId = parsed.searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&playsinline=1` : undefined;
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        const videoId = parsed.pathname.split('/')[2];
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&playsinline=1` : undefined;
      }
    }

    if (host === 'youtu.be') {
      const videoId = parsed.pathname.replace('/', '');
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&playsinline=1` : undefined;
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
      const cleanVideoId = videoId.split('?')[0];
      return appendQuery(`https://iframe.mediadelivery.net/embed/${libraryId}/${cleanVideoId}`, {
        autoplay: 'false',
        loop: 'false',
        muted: 'false',
        preload: 'metadata',
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
  if (!url) return { kind: 'empty' };
  if (url.includes('youtube.com/results')) return { kind: 'empty' };

  const bunny = bunnyEmbedUrl(url);
  if (bunny) return { kind: 'iframe', src: bunny };

  const youtube = youtubeEmbedUrl(url);
  if (youtube) return { kind: 'iframe', src: youtube };

  const drive = drivePreviewUrl(url);
  if (drive) return { kind: 'iframe', src: drive };

  if (isDirectVideoUrl(url)) return { kind: 'video', src: url };
  if (isHlsUrl(url)) return { kind: 'unsupported', src: url, note: 'ลิงก์นี้เป็น HLS (.m3u8) ต้องใช้ hls.js หรือ embed player ที่รองรับ' };

  return { kind: 'iframe', src: url };
}

function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[22px] bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl ${className}`}>{children}</div>;
}

function StatusBadge({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md md:text-[11px] ${active ? 'bg-[#e50914]/22 text-red-100' : 'bg-white/[0.105] text-white/78'}`}>
      {children}
    </span>
  );
}

function PlayerEmpty({ title, fallbackImage, label }: { title: string; fallbackImage: string; label: string }) {
  return (
    <div className="relative grid aspect-video place-items-center overflow-hidden rounded-[20px] bg-black/58 text-center shadow-[0_24px_90px_rgba(0,0,0,0.72)] backdrop-blur-md md:rounded-[26px]">
      {fallbackImage ? <img src={fallbackImage} alt={title} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-25 blur-[1px]" /> : null}
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
      <iframe
        src={source.src}
        title={title}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        className="aspect-video w-full border-0 bg-black"
        onError={() => setFailed(true)}
      />
      {failed ? <a href={source.src} target="_blank" rel="noreferrer" className="absolute right-3 top-3 rounded-xl bg-black/62 px-3 py-2 text-[11px] font-black text-white/85 backdrop-blur-xl">เปิดลิงก์</a> : null}
    </div>
  );
}

function fallbackCast(item: MovieItem): CastPerson[] {
  const genres = item.genres?.length ? item.genres : ['ภาพยนตร์'];
  return ['นักแสดงนำ', 'ตัวละครสำคัญ', 'นักแสดงสมทบ', 'บทบาทพิเศษ', 'ตัวละครรอง', 'นักแสดงรับเชิญ', 'บทสำคัญ', 'นักแสดงหลัก', 'บทพิเศษ'].map((role, index) => ({
    name: `นักแสดง ${String.fromCharCode(65 + index)}`,
    role: `${role} • ${genres[index % genres.length]}`,
    initial: String.fromCharCode(65 + index),
  }));
}

function ActorCard({ person }: { person: CastPerson }) {
  return (
    <div className="relative aspect-[2/3] overflow-hidden rounded-[12px] bg-white/[0.055] shadow-[0_16px_54px_rgba(0,0,0,0.55)] backdrop-blur-xl md:rounded-[16px]">
      {person.profileUrl ? <img src={person.profileUrl} alt={person.name} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_24%,#8a111b,#111_62%)] text-4xl font-black text-white/78 md:text-5xl">{person.initial || person.name.slice(0, 1)}</div>}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.06)_44%,rgba(0,0,0,0.92)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 p-2 md:p-3">
        <h4 className="line-clamp-2 text-[10px] font-black leading-tight text-white drop-shadow md:text-sm">{person.name}</h4>
        <p className="mt-1 line-clamp-2 text-[8px] font-bold leading-3 text-white/52 md:text-[10px] md:leading-4">{person.character || person.role || 'นักแสดง'}</p>
      </div>
    </div>
  );
}

function ModalWatchSection({
  item,
  fallbackImage,
  onReport,
  reported,
  episodes,
  episodeLoading,
  canWatch,
  premiumLabel,
}: {
  item: MovieItem;
  fallbackImage: string;
  onReport: () => void;
  reported: boolean;
  episodes?: PublicEpisode[];
  episodeLoading?: boolean;
  canWatch: boolean;
  premiumLabel?: string;
}) {
  const readyEpisodes = episodes || [];
  const firstEpisodeHref = readyEpisodes[0]?.href;
  const watchHref = item.watchUrl || firstEpisodeHref;
  const hasLink = Boolean(watchHref);

  return (
    <section className="mt-5 overflow-hidden rounded-[22px] border border-[#e50914]/18 bg-[linear-gradient(135deg,rgba(229,9,20,0.16),rgba(255,255,255,0.045))] shadow-[0_24px_90px_rgba(0,0,0,0.56)] backdrop-blur-xl">
      <div className="relative min-h-[132px] p-4 md:min-h-[148px] md:p-5">
        {fallbackImage ? <img src={fallbackImage} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-14" /> : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,5,0.96),rgba(5,5,5,0.76)_58%,rgba(5,5,5,0.58))]" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-100/70">WATCH READY</p>
            <h3 className="mt-1 text-xl font-black tracking-[-0.04em] text-white md:text-2xl">
              {hasLink ? readyEpisodes.length ? `พร้อมรับชม ${readyEpisodes.length} ตอน` : 'พร้อมรับชม' : 'ยังไม่มีลิงก์รับชม'}
            </h3>
            <p className="mt-2 max-w-xl text-xs font-semibold leading-5 text-white/55 md:text-sm md:leading-6">
              {hasLink ? readyEpisodes.length ? 'เลือกตอนที่ต้องการ หรือเปิดตอนแรกในแท็บใหม่เพื่อรับชมได้ทันที' : 'กดเพื่อเปิดหน้าเล่นในแท็บใหม่ แล้วกลับมาดูข้อมูลเรื่องนี้ต่อได้เลย' : 'เรื่องนี้ยังไม่พร้อมรับชมตอนนี้ เก็บไว้ก่อนหรือแจ้งแอดมินให้ตรวจสอบได้'}
            </p>
            {hasLink && premiumLabel ? <p className="mt-2 inline-flex rounded-full bg-[#e50914]/18 px-3 py-1 text-[10px] font-black text-red-100">{premiumLabel}</p> : null}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {hasLink && canWatch ? (
              <a href={watchHref} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#e50914] px-5 text-sm font-black text-white shadow-glow transition hover:scale-[1.01] md:h-12 md:px-6">
                ▶ เปิดหน้าเล่น
              </a>
            ) : hasLink ? (
              <a href="/membership" className="inline-flex h-11 items-center justify-center rounded-2xl bg-white/[0.08] px-5 text-sm font-black text-white/70 md:h-12 md:px-6">
                Premium
              </a>
            ) : (
              <button type="button" disabled className="inline-flex h-11 cursor-not-allowed items-center justify-center rounded-2xl bg-white/[0.08] px-5 text-sm font-black text-white/38 md:h-12 md:px-6">
                ยังไม่พร้อม
              </button>
            )}
            <button onClick={onReport} className="h-11 rounded-2xl bg-black/35 px-4 text-xs font-black text-white/70 shadow-[0_12px_34px_rgba(0,0,0,0.32)] backdrop-blur-xl hover:bg-white/[0.08] md:h-12">
              แจ้งลิงก์เสีย
            </button>
          </div>
        </div>
        {episodeLoading ? <p className="relative z-10 mt-4 rounded-2xl bg-white/[0.06] p-3 text-xs font-bold text-white/45">กำลังโหลดตอน...</p> : null}
        {readyEpisodes.length ? (
          <div className="relative z-10 mt-4 rounded-2xl border border-white/10 bg-black/34 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/48">ตอน</p>
              <span className="text-[10px] font-black text-white/35">{readyEpisodes.length} ตอน</span>
            </div>
            <div className="grid max-h-28 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-6">
              {readyEpisodes.map((episode) => (
                <a key={`${episode.seasonNumber}-${episode.episodeNumber}`} href={canWatch ? episode.href : '/membership'} target={canWatch ? '_blank' : undefined} rel={canWatch ? 'noreferrer' : undefined} title={episode.title || `EP ${episode.episodeNumber}`} className="rounded-xl border border-white/10 bg-white/[0.07] px-2.5 py-2 text-center text-[11px] font-black text-white/76 transition hover:border-[#e50914]/70 hover:bg-[#e50914] hover:text-white">
                  S{episode.seasonNumber}E{episode.episodeNumber}{episode.title ? ` · ${episode.title}` : ''}
                </a>
              ))}
            </div>
          </div>
        ) : null}
        {reported ? <p className="relative z-10 mt-4 rounded-2xl bg-green-400/[0.09] p-3 text-xs font-bold text-green-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl md:text-sm">รับรายงานแล้ว ทีมแอดมินจะตรวจสอบลิงก์นี้</p> : null}
      </div>
    </section>
  );
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
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e50914]">ค้นหาบนดูดีดี.online</p>
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

export function DetailWindow({ item, recommendations, onClose, onSelect, initialTab = 'recommend' }: { item: MovieItem; recommendations: MovieItem[]; onClose: () => void; onSelect: (item: MovieItem) => void; initialTab?: 'recommend' | 'watch' }) {
  const [reported, setReported] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('recommend');
  const [expanded, setExpanded] = useState(false);
  const [visibleRecCount, setVisibleRecCount] = useState(MODAL_REC_BATCH_SIZE);
  const [detailItem, setDetailItem] = useState<MovieItem>(item);
  const [realCast, setRealCast] = useState<CastPerson[]>([]);
  const [detailRecommendations, setDetailRecommendations] = useState<MovieItem[]>(recommendations);
  const [detailLoading, setDetailLoading] = useState(false);
  const [seriesEpisodes, setSeriesEpisodes] = useState<PublicEpisode[]>([]);
  const [seriesEpisodesLoading, setSeriesEpisodesLoading] = useState(false);
  const { config: premiumAccessConfig, userState: premiumUserState } = usePremiumAccessSnapshot();
  const recRailRef = useRef<HTMLDivElement | null>(null);
  const watchSectionRef = useRef<HTMLDivElement | null>(null);

  const displayItem = detailItem;
  const cast = realCast.length ? realCast : fallbackCast(displayItem);
  const visibleRecommendations = detailRecommendations.slice(0, visibleRecCount);
  const fallbackImage = displayItem.backdropUrl || displayItem.posterUrl || '';
  const hasWatchLink = Boolean(displayItem.watchUrl || seriesEpisodes.length);
  const canWatch = canUsePremiumFeature('watch', premiumUserState, premiumAccessConfig);
  const premiumPromoLabel = hasWatchLink && canWatch && !premiumUserState.hasPremiumAccess ? premiumAccessConfig.label : '';
  const availabilityBadge = hasWatchLink ? 'HD' : displayItem.trailerUrl ? 'ตัวอย่าง' : 'ข้อมูล';

  useEffect(() => {
    function closeFromOverlayRequest() {
      onClose();
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('dofree-close-content-overlays', closeFromOverlayRequest);
    document.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('dofree-close-content-overlays', closeFromOverlayRequest);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setActiveTab('recommend');
    setExpanded(false);
    setReported(false);
    setVisibleRecCount(MODAL_REC_BATCH_SIZE);
    setDetailItem(item);
    setRealCast([]);
    setDetailRecommendations(recommendations);
    setDetailLoading(true);
    setSeriesEpisodes([]);
    setSeriesEpisodesLoading(item.mediaType === 'tv');

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

    async function loadEpisodes() {
      if (item.mediaType !== 'tv') return;
      try {
        const response = await fetch(`/api/series-episodes?tmdbId=${item.id}`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) return;
        const payload = (await response.json()) as { ok?: boolean; episodes?: PublicEpisode[] };
        if (!cancelled) setSeriesEpisodes(payload.episodes || []);
      } catch {
      } finally {
        if (!cancelled) setSeriesEpisodesLoading(false);
      }
    }

    loadDetail();
    loadEpisodes();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [item.id, item.mediaType, recommendations]);

  useEffect(() => {
    if (initialTab !== 'watch') return;
    const timer = window.setTimeout(() => {
      watchSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [initialTab, item.id, seriesEpisodes.length]);

  useEffect(() => {
    const rail = recRailRef.current;
    if (activeTab !== 'recommend' || !rail) return;

    function maybeLoadMore() {
      const currentRail = recRailRef.current;
      if (!currentRail) return;
      const remaining = currentRail.scrollWidth - currentRail.clientWidth - currentRail.scrollLeft;
      if (remaining <= MODAL_REC_LOAD_THRESHOLD) {
        setVisibleRecCount((count) => Math.min(count + MODAL_REC_BATCH_SIZE, detailRecommendations.length));
      }
    }

    rail.addEventListener('scroll', maybeLoadMore, { passive: true });
    window.setTimeout(maybeLoadMore, 120);
    return () => rail.removeEventListener('scroll', maybeLoadMore);
  }, [activeTab, detailRecommendations.length, visibleRecCount]);

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

  function scrollToWatchSection() {
    watchSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[90] overflow-y-auto bg-black/70 px-2 py-4 text-white backdrop-blur-2xl md:bg-black/78 md:px-4 md:py-7" role="dialog" aria-modal="true">
      <div onClick={(event) => event.stopPropagation()} className="mx-auto w-full max-w-[860px] overflow-hidden rounded-[28px] bg-[#050505]/88 shadow-[0_42px_150px_rgba(0,0,0,0.94)] backdrop-blur-2xl md:rounded-[34px]">
        <div className="relative bg-black/42 shadow-[inset_0_-80px_110px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="absolute inset-0 bg-cover bg-center opacity-24 blur-[1px]" style={{ backgroundImage: `url(${fallbackImage})` }} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.42),rgba(5,5,5,0.86)_55%,rgba(5,5,5,0.98)_100%)] md:bg-[linear-gradient(90deg,rgba(5,5,5,0.98)_0%,rgba(5,5,5,0.86)_42%,rgba(5,5,5,0.48)_100%)]" />
          <button onClick={onClose} className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/62 text-xl font-black text-white/80 shadow-[0_14px_42px_rgba(0,0,0,0.72)] backdrop-blur-xl hover:bg-white/[0.12] md:right-4 md:top-4 md:h-11 md:w-11 md:text-2xl" aria-label="ปิดรายละเอียด">×</button>

          <div className="relative z-10 grid grid-cols-[88px_1fr] gap-3 p-4 pt-5 md:grid-cols-[118px_1fr] md:gap-4 md:p-5 md:pb-4">
            <div className="overflow-hidden rounded-[16px] bg-black/40 shadow-[0_20px_55px_rgba(0,0,0,0.75)] backdrop-blur-md md:rounded-[20px]">
              {displayItem.posterUrl ? <img src={displayItem.posterUrl} alt={displayItem.title} loading="lazy" decoding="async" className="h-[132px] w-full object-cover md:h-[176px]" /> : null}
            </div>
            <div className="min-w-0 pr-9 md:pr-11">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#e50914] md:text-[10px] md:tracking-[0.24em]">{displayItem.mediaType === 'tv' ? 'ซีรีส์' : 'ภาพยนตร์'}</p>
              <h2 className="modal-title mt-1.5 line-clamp-2 text-[21px] font-black leading-[0.98] tracking-[-0.06em] text-white md:text-[31px]">{displayItem.title}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-black md:text-[11px]">
                <StatusBadge>★ {(displayItem.rating || 0).toFixed(1)}</StatusBadge>
                <StatusBadge>{displayItem.year}</StatusBadge>
                <StatusBadge>{displayItem.language === 'th' ? 'TH' : displayItem.language || 'EN'}</StatusBadge>
                <StatusBadge active>{availabilityBadge}</StatusBadge>
              </div>
              <p className={`${expanded ? '' : 'line-clamp-3'} mt-2 text-[11px] font-medium leading-4 text-white/58 md:text-[13px] md:leading-5`}>{displayItem.overview}</p>
              <button onClick={() => setExpanded((value) => !value)} className="mt-1 text-[10px] font-black text-red-200/80 hover:text-red-100 md:text-xs">{expanded ? 'ย่อ' : 'ดูเพิ่มเติม'}</button>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={scrollToWatchSection} disabled={!displayItem.watchUrl && !seriesEpisodes.length} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-black text-white shadow-[0_14px_36px_rgba(0,0,0,0.42)] backdrop-blur-xl md:h-9 md:px-4 md:text-xs ${displayItem.watchUrl || seriesEpisodes.length ? 'bg-[#e50914]' : 'bg-white/[0.09] text-white/40'}`}>▶ รับชม</button>
                <button onClick={() => setActiveTab('recommend')} className="inline-flex h-8 items-center rounded-lg bg-white/[0.1] px-3 text-[11px] font-black text-white/82 shadow-[0_14px_36px_rgba(0,0,0,0.32)] backdrop-blur-xl hover:bg-white/[0.16] md:h-9 md:px-4 md:text-xs">+ รายการโปรด</button>
              </div>
            </div>
          </div>

          <div className="relative z-10 px-4 pb-4 md:px-5 md:pb-5">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-100/68 md:text-xs">ตัวอย่าง</p>
            <InlinePlayer url={displayItem.trailerUrl} title={`ตัวอย่าง ${displayItem.title}`} fallbackImage={fallbackImage} emptyLabel={detailLoading ? 'กำลังโหลดตัวอย่าง...' : 'ยังไม่มีตัวอย่างที่เปิดดูได้'} />
          </div>
        </div>

        <div className="sticky top-0 z-20 bg-black/62 px-3 shadow-[0_20px_60px_rgba(0,0,0,0.58)] backdrop-blur-2xl md:px-5">
          <div className="movie-rail flex gap-1 overflow-x-auto py-2.5 md:gap-1.5 md:py-3">
            {modalTabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`min-w-max rounded-md px-3 py-1.5 text-[10px] font-black transition shadow-[0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl md:px-4 md:py-2 md:text-xs ${activeTab === tab.id ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/55 hover:bg-white/[0.12] hover:text-white'}`}>{tab.label}</button>)}
          </div>
        </div>

        <div className="p-3 md:p-4">
          <Surface className="min-h-[320px] p-4 md:p-5">
            {activeTab === 'cast' && (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-black md:text-xl">นักแสดงหลัก</h3>
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-black text-white/38 backdrop-blur-xl">{realCast.length ? 'นักแสดง' : 'กำลังจัดข้อมูล'}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-3">{cast.map((person, index) => <ActorCard key={`${person.id || person.name}-${index}`} person={person} />)}</div>
              </div>
            )}

            {activeTab === 'detail' && (
              <div>
                <div className="flex items-center justify-between gap-3"><h3 className="text-base font-black md:text-xl">เกี่ยวกับภาพยนตร์</h3>{detailLoading ? <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-black text-white/38 backdrop-blur-xl">กำลังโหลดข้อมูล</span> : null}</div>
                <div className="mt-3 grid gap-2 text-[11px] font-bold text-white/62 sm:grid-cols-2 md:mt-4 md:gap-3 md:text-sm">
                  <p>ประเภท: {(displayItem.genres || []).join(', ') || 'ภาพยนตร์'}</p>
                  <p>ความยาว: {displayItem.runtime ? `${displayItem.runtime} นาที` : 'ยังไม่มีข้อมูล'}</p>
                  <p>วันฉาย: {displayItem.year}</p>
                  <p>ภาษา: {displayItem.language === 'th' ? 'ไทย' : displayItem.language || 'ไม่ระบุ'}</p>
                  <p>สถานะ: {hasWatchLink ? 'พร้อมรับชม' : displayItem.trailerUrl ? 'มีตัวอย่าง' : 'ข้อมูล'}</p>
                  <p>คะแนน: {(displayItem.rating || 0).toFixed(1)} / 10</p>
                </div>
                <p className="mt-4 text-xs leading-5 text-white/58 md:text-sm md:leading-6">{displayItem.overview}</p>
              </div>
            )}

            {activeTab === 'recommend' && (
              <div>
                <div className="flex items-end justify-between gap-3">
                  <h3 className="text-base font-black md:text-xl">แนะนำสำหรับคุณ</h3>
                  <span className="text-[10px] font-black text-white/35">แสดง {visibleRecommendations.length}/{detailRecommendations.length}</span>
                </div>
                <div
                  ref={recRailRef}
                  className="movie-rail mt-3 flex max-w-full gap-2 overflow-x-auto overflow-y-hidden scroll-smooth pb-2 md:gap-3"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {visibleRecommendations.map((movie, index) => (
                    <MovieCard
                      key={`modal-rec-${movie.mediaType}-${movie.id}-${index}`}
                      item={movie}
                      compact
                      onSelect={(nextItem) => {
                        onSelect(nextItem);
                        setActiveTab('recommend');
                        setExpanded(false);
                      }}
                      priorityBadge={index % 2 === 0 ? 'แนะนำ' : undefined}
                    />
                  ))}
                  {visibleRecommendations.length < detailRecommendations.length ? (
                    <button
                      type="button"
                      onClick={() => setVisibleRecCount((count) => Math.min(count + MODAL_REC_BATCH_SIZE, detailRecommendations.length))}
                      className="grid h-[176px] w-[88px] shrink-0 place-items-center rounded-[10px] bg-white/[0.055] px-2 text-center text-[10px] font-black text-white/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-white/[0.095] hover:text-white md:h-[220px] md:w-[112px]"
                    >
                      โหลดอีก 6 เรื่อง
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {activeTab === 'spoiler' && <div><h3 className="text-base font-black md:text-xl">เรื่องย่อ</h3><div className="mt-3 rounded-2xl bg-yellow-300/[0.08] p-3 text-xs leading-5 text-yellow-50/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl md:text-sm md:leading-6">{displayItem.overview}</div></div>}

            <div ref={watchSectionRef}>
              <ModalWatchSection item={displayItem} fallbackImage={fallbackImage} onReport={reportIssue} reported={reported} episodes={seriesEpisodes} episodeLoading={seriesEpisodesLoading} canWatch={canWatch} premiumLabel={premiumPromoLabel} />
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
