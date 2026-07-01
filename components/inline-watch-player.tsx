'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DetailReportButton } from '@/components/detail-report-button';
import type { MediaType } from '@/lib/tmdb';

type InlineWatchEpisode = {
  key: string;
  label: string;
  sourceUrl: string;
};

type InlineWatchPlayerProps = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  fallbackImage: string;
  sourceUrl?: string;
  episodes?: InlineWatchEpisode[];
};

function youtubeKey(url: URL) {
  if (url.hostname.includes('youtu.be')) return url.pathname.replace('/', '');
  if (url.searchParams.get('v')) return url.searchParams.get('v') || undefined;
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') return parts[1];
  return undefined;
}

function toEmbedUrl(value?: string) {
  const raw = value?.trim();
  if (!raw) return undefined;

  try {
    const url = new URL(raw, window.location.origin);

    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
      const key = youtubeKey(url);
      return key ? `https://www.youtube.com/embed/${key}` : raw;
    }

    const driveMatch = raw.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (driveMatch?.[1]) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;

    const driveId = url.hostname.includes('drive.google.com') ? url.searchParams.get('id') : null;
    if (driveId) return `https://drive.google.com/file/d/${driveId}/preview`;

    return raw;
  } catch {
    return raw;
  }
}

export function InlineWatchPlayer({ tmdbId, mediaType, title, fallbackImage, sourceUrl, episodes = [] }: InlineWatchPlayerProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const loadTimerRef = useRef<number | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [selectedKey, setSelectedKey] = useState(episodes[0]?.key || 'main');
  const hasEpisodes = mediaType === 'tv' && episodes.length > 1;
  const selectedEpisode = episodes.find((episode) => episode.key === selectedKey) || episodes[0];
  const activeSourceUrl = selectedEpisode?.sourceUrl || sourceUrl;
  const embedUrl = useMemo(() => toEmbedUrl(activeSourceUrl), [activeSourceUrl]);
  const hasVideo = Boolean(activeSourceUrl);

  function requestPlayerLoad(delay = 160) {
    if (!hasVideo) return;
    if (loadTimerRef.current) window.clearTimeout(loadTimerRef.current);
    loadTimerRef.current = window.setTimeout(() => setShouldLoad(true), delay);
  }

  useEffect(() => {
    return () => {
      if (loadTimerRef.current) window.clearTimeout(loadTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (window.location.hash === '#watch') requestPlayerLoad(260);

    function onHashChange() {
      if (window.location.hash === '#watch') requestPlayerLoad(180);
    }

    function onLoadPlayer() {
      requestPlayerLoad(120);
    }

    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('dofree-load-player', onLoadPlayer);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('dofree-load-player', onLoadPlayer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasVideo, activeSourceUrl]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || shouldLoad) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          requestPlayerLoad(120);
          observer.disconnect();
        }
      },
      { rootMargin: '120px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldLoad, hasVideo, activeSourceUrl]);

  return (
    <section ref={rootRef} id="watch" className="scroll-mt-24 px-4 sm:px-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100/68 md:text-xs">รับชม</p>
        <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[9px] font-black text-white/42 backdrop-blur-xl md:text-[10px]">WATCH READY</span>
      </div>

      <div className="relative aspect-video w-full max-w-full overflow-hidden rounded-[28px] border border-white/15 bg-black shadow-[0_24px_90px_rgba(0,0,0,0.72)] sm:rounded-[32px]">
        {fallbackImage ? <img src={fallbackImage} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-35" /> : null}
        <div className="absolute inset-0 bg-black/65" />

        {hasVideo && shouldLoad && embedUrl ? (
          <iframe
            src={embedUrl}
            title={`รับชม ${title}`}
            className="absolute inset-0 h-full w-full border-0 bg-black"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            referrerPolicy="no-referrer"
            allowFullScreen
          />
        ) : (
          <div className="relative z-10 flex h-full min-w-0 flex-col justify-end p-5 text-left sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/70 sm:text-xs">
              WATCH READY
            </p>
            <h2 className="mt-2 max-w-full break-words text-2xl font-black leading-tight tracking-[-0.05em] text-white sm:text-3xl md:text-4xl">
              {hasVideo ? 'พร้อมเริ่มเล่นวิดีโอ' : 'ยังไม่พร้อมรับชม'}
            </h2>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/75">
              {hasVideo ? 'กดรับชมจากด้านบนหรือกดปุ่มนี้ ระบบจะเปิด player ในหน้านี้ทันที' : 'กำลังอัปเดตลิงก์รับชมสำหรับเรื่องนี้'}
            </p>
            <div className="mt-5 flex max-w-full flex-wrap gap-3">
              {hasVideo ? (
                <button type="button" onClick={() => requestPlayerLoad(0)} className="rounded-2xl bg-[#e50914] px-5 py-3 text-sm font-black text-white shadow-glow sm:px-6 sm:py-4">
                  ▶ เริ่มรับชม
                </button>
              ) : null}
              <DetailReportButton tmdbId={tmdbId} mediaType={mediaType} title={title} className="rounded-2xl bg-black/45 px-5 py-3 text-sm font-black text-white shadow-[0_12px_34px_rgba(0,0,0,0.32)] backdrop-blur-xl transition hover:bg-white/[0.08] sm:px-6 sm:py-4">
                แจ้งลิงก์รับชม
              </DetailReportButton>
            </div>
          </div>
        )}
      </div>

      <div className="movie-rail mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
        {['TH', 'ENG', 'ORIGINAL'].map((label, index) => {
          const active = hasVideo && index === 0;
          return (
            <button
              key={label}
              type="button"
              disabled={!active}
              className={`min-h-[42px] min-w-[76px] rounded-2xl px-4 text-xs font-black transition ${active ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.06] text-white/35'}`}
            >
              {label}
            </button>
          );
        })}
        <DetailReportButton tmdbId={tmdbId} mediaType={mediaType} title={title} className="min-h-[42px] min-w-max rounded-2xl bg-white/[0.08] px-4 text-xs font-black text-white/68 backdrop-blur-xl transition hover:bg-white/[0.14]">
          แจ้งลิงก์เสีย
        </DetailReportButton>
      </div>

      {hasEpisodes ? (
        <div className="movie-rail mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
          {episodes.map((episode) => {
            const active = episode.key === selectedKey;
            return (
              <button
                key={episode.key}
                type="button"
                onClick={() => {
                  setSelectedKey(episode.key);
                  setShouldLoad(false);
                  window.setTimeout(() => requestPlayerLoad(180), 40);
                }}
                className={`min-h-[42px] min-w-max rounded-2xl px-4 text-xs font-black transition ${active ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.08] text-white/68 hover:bg-white/[0.14] hover:text-white'}`}
              >
                {episode.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
