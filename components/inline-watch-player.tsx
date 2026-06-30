'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MediaType } from '@/lib/tmdb';
import { DetailReportButton } from '@/components/detail-report-button';

export type InlineWatchEpisode = {
  key: string;
  label: string;
  title?: string | null;
  sourceUrl?: string;
  seasonNumber: number;
  episodeNumber: number;
};

type InlineWatchPlayerProps = {
  title: string;
  tmdbId: number;
  mediaType: MediaType;
  sourceUrl?: string;
  backdropUrl?: string;
  posterUrl?: string;
  itemLanguage?: string;
  episodes?: InlineWatchEpisode[];
  initialEpisodeKey?: string;
};

const languageOptions = [
  { key: 'th', label: 'TH' },
  { key: 'eng', label: 'ENG' },
  { key: 'original', label: 'ORIGINAL' },
] as const;

function defaultLanguageKey(language?: string) {
  if (language === 'th') return 'th';
  if (language === 'en') return 'eng';
  return 'original';
}

export function InlineWatchPlayer({
  title,
  tmdbId,
  mediaType,
  sourceUrl,
  backdropUrl,
  posterUrl,
  itemLanguage,
  episodes = [],
  initialEpisodeKey,
}: InlineWatchPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fallbackImage = backdropUrl || posterUrl || '';
  const playableEpisodes = useMemo(() => episodes.filter((episode) => Boolean(episode.sourceUrl)), [episodes]);
  const preferredEpisode = useMemo(
    () => playableEpisodes.find((episode) => episode.key === initialEpisodeKey) || playableEpisodes[0],
    [initialEpisodeKey, playableEpisodes],
  );
  const initialSource = preferredEpisode?.sourceUrl || sourceUrl;
  const [shouldLoadPlayer, setShouldLoadPlayer] = useState(false);
  const [activeSource, setActiveSource] = useState<string | undefined>(initialSource);
  const [activeEpisodeKey, setActiveEpisodeKey] = useState<string | undefined>(preferredEpisode?.key);
  const [activeLanguage, setActiveLanguage] = useState(defaultLanguageKey(itemLanguage));
  const hasVideo = Boolean(activeSource);

  useEffect(() => {
    setActiveSource(initialSource);
    setActiveEpisodeKey(preferredEpisode?.key);
  }, [initialSource, preferredEpisode?.key]);

  useEffect(() => {
    if (!hasVideo || shouldLoadPlayer) return;
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadPlayer(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasVideo, shouldLoadPlayer]);

  return (
    <section id="watch" className="w-full max-w-full overflow-hidden scroll-mt-24">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100/68 md:text-xs">รับชม</p>
        <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[9px] font-black text-white/42 backdrop-blur-xl md:text-[10px]">
          WATCH PLAYER
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative aspect-video w-full max-w-full overflow-hidden rounded-[28px] border border-white/15 bg-black shadow-[0_24px_90px_rgba(0,0,0,0.72)] md:rounded-[30px]"
      >
        {fallbackImage ? <img src={fallbackImage} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-35" /> : null}
        <div className="absolute inset-0 bg-black/65" />

        {hasVideo ? (
          shouldLoadPlayer ? (
            <iframe
              key={activeSource}
              src={activeSource}
              title={`รับชม ${title}`}
              loading="lazy"
              className="absolute inset-0 h-full w-full border-0 bg-black"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              referrerPolicy="no-referrer"
              allowFullScreen
            />
          ) : (
            <div className="relative z-10 flex h-full w-full flex-col justify-end p-5 sm:p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/70">WATCH READY</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white sm:text-3xl">กำลังเตรียมวิดีโอรับชม...</h2>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/70">เลื่อนใกล้โซนนี้แล้วระบบจะโหลด player จริงโดยอัตโนมัติ</p>
            </div>
          )
        ) : (
          <div className="relative z-10 flex h-full w-full flex-col justify-end p-5 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/70">WATCH READY</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white sm:text-3xl">ยังไม่พร้อมรับชม</h2>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/78">กำลังอัปเดตลิงก์รับชมสำหรับเรื่องนี้</p>
            <div className="mt-5 flex max-w-full flex-wrap gap-3">
              <DetailReportButton tmdbId={tmdbId} mediaType={mediaType} title={title} className="min-h-11 rounded-2xl bg-[#e50914] px-5 py-3 text-sm font-black text-white shadow-glow transition hover:brightness-110">
                แจ้งลิงก์รับชม
              </DetailReportButton>
            </div>
          </div>
        )}
      </div>

      <div className="movie-rail mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
        {languageOptions.map((option) => {
          const disabled = option.key === 'eng' && itemLanguage !== 'en';
          const active = activeLanguage === option.key && !disabled;
          return (
            <button
              key={option.key}
              type="button"
              disabled={disabled}
              onClick={() => setActiveLanguage(option.key)}
              className={`min-h-11 min-w-[72px] shrink-0 rounded-2xl px-4 text-xs font-black transition ${active ? 'bg-[#e50914] text-white shadow-glow' : disabled ? 'bg-white/[0.045] text-white/24' : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.14] hover:text-white'}`}
            >
              {option.label}
            </button>
          );
        })}
        <DetailReportButton tmdbId={tmdbId} mediaType={mediaType} title={title} className="min-h-11 shrink-0 rounded-2xl bg-black/45 px-4 text-xs font-black text-white/78 transition hover:bg-white/[0.1]">
          แจ้งลิงก์เสีย
        </DetailReportButton>
      </div>

      {mediaType === 'tv' && playableEpisodes.length > 1 ? (
        <div className="movie-rail mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
          {playableEpisodes.map((episode) => {
            const active = episode.key === activeEpisodeKey;
            return (
              <button
                key={episode.key}
                type="button"
                onClick={() => {
                  setActiveEpisodeKey(episode.key);
                  setActiveSource(episode.sourceUrl);
                }}
                className={`min-h-11 shrink-0 rounded-2xl px-4 text-xs font-black transition ${active ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.14] hover:text-white'}`}
                title={episode.title || episode.label}
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
