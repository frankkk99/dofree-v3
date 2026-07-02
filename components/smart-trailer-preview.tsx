'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MediaType } from '@/lib/tmdb';

type TrailerMode = 'thai_dub' | 'thai_sub' | 'thai_first' | 'any';

type TrailerCandidate = {
  videoId: string;
  title: string;
  embedUrl: string;
  languageMatch: TrailerMode | 'fallback_any';
  score: number;
};

type TrailerPayload = {
  ok?: boolean;
  missingApiKey?: boolean;
  recommended?: TrailerCandidate | null;
  fallbackUsed?: boolean;
};

type SmartTrailerPreviewProps = {
  title: string;
  titleEn?: string;
  year?: string;
  tmdbId: number;
  mediaType: MediaType;
  trailerUrl?: string;
  fallbackImage: string;
  mode?: TrailerMode;
};

function youtubeKey(url: URL) {
  if (url.hostname.includes('youtu.be')) return url.pathname.replace('/', '');
  if (url.searchParams.get('v')) return url.searchParams.get('v') || undefined;
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') return parts[1];
  return undefined;
}

function youtubeEmbedUrl(value?: string) {
  const raw = value?.trim();
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
      const key = youtubeKey(url);
      return key ? `https://www.youtube.com/embed/${key}?autoplay=0&rel=0&playsinline=1` : undefined;
    }
  } catch {}

  return undefined;
}

function badgeLabel(candidate?: TrailerCandidate | null, loading?: boolean, missingApiKey?: boolean, shouldLoad?: boolean) {
  if (!shouldLoad) return 'แตะเพื่อโหลด';
  if (loading) return 'กำลังค้นหา';
  if (candidate?.languageMatch === 'thai_dub') return 'พากย์ไทย';
  if (candidate?.languageMatch === 'thai_sub') return 'ซับไทย';
  if (candidate?.languageMatch === 'fallback_any') return 'ตัวอย่างสำรอง';
  if (missingApiKey) return 'ต้องตั้งค่า API';
  return 'ตัวอย่าง';
}

export function SmartTrailerPreview({ title, titleEn, year, tmdbId, mediaType, trailerUrl, fallbackImage, mode = 'thai_first' }: SmartTrailerPreviewProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const directEmbedUrl = useMemo(() => youtubeEmbedUrl(trailerUrl), [trailerUrl]);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [candidate, setCandidate] = useState<TrailerCandidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [missingApiKey, setMissingApiKey] = useState(false);
  const embedUrl = shouldLoad ? directEmbedUrl || candidate?.embedUrl : undefined;

  useEffect(() => {
    const node = rootRef.current;
    if (!node || shouldLoad) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: '180px 0px' });

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) return;
    if (directEmbedUrl) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({
      title,
      titleEn: titleEn || '',
      year: year || '',
      tmdbId: String(tmdbId),
      mediaType,
      mode,
    });

    setLoading(true);
    fetch(`/api/youtube/trailer?${params.toString()}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload: TrailerPayload) => {
        if (cancelled) return;
        setMissingApiKey(Boolean(payload?.missingApiKey));
        setCandidate(payload?.recommended || null);
      })
      .catch(() => {
        if (!cancelled) setCandidate(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [directEmbedUrl, mediaType, mode, shouldLoad, title, titleEn, tmdbId, year]);

  return (
    <section ref={rootRef} id="trailer" className="scroll-mt-20 px-4 sm:px-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100/68 md:text-xs">Trailer Preview</p>
        <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[9px] font-black text-white/42 backdrop-blur-xl md:text-[10px]">{badgeLabel(candidate, loading, missingApiKey, shouldLoad)}</span>
      </div>
      <div className="relative aspect-video w-full max-w-full overflow-hidden rounded-[28px] bg-black shadow-[0_24px_90px_rgba(0,0,0,0.72)] sm:rounded-[32px]">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={`ตัวอย่าง ${title}`}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full border-0 bg-black"
          />
        ) : (
          <>
            {fallbackImage ? <img src={fallbackImage} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-35" /> : null}
            <div className="absolute inset-0 bg-black/68" />
            <div className="relative z-10 grid h-full place-items-center px-6 text-center">
              <div>
                <button type="button" onClick={() => setShouldLoad(true)} className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/[0.10] text-xl font-black text-white/65 backdrop-blur-xl transition hover:bg-[#e50914] hover:text-white">▶</button>
                <p className="mt-3 text-xs font-black text-white/72 md:text-sm">{shouldLoad ? loading ? 'กำลังค้นหาตัวอย่างจาก YouTube' : 'ยังไม่มีตัวอย่างที่เล่นในเว็บ' : 'แตะเพื่อโหลดตัวอย่างเมื่ออยากดู'}</p>
                <p className="mt-1 text-[10px] font-bold text-white/40 md:text-xs">{missingApiKey ? 'ต้องตั้งค่า YOUTUBE_DATA_API_KEY ก่อน ระบบจึงจะค้น YouTube อัตโนมัติได้' : 'ลดการโหลด iframe และ API จนกว่าผู้ใช้จะมาถึงส่วนตัวอย่าง'}</p>
              </div>
            </div>
          </>
        )}
      </div>
      {candidate?.title && !directEmbedUrl ? <p className="mt-2 line-clamp-1 text-[10px] font-bold text-white/36">ใช้ตัวอย่างอัตโนมัติ: {candidate.title}</p> : null}
    </section>
  );
}
