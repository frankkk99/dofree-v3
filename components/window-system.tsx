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
  { id: 'watch', label: 'รับชม' },
] as const;

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
  const roles =
    item.mediaType === 'tv'
      ? ['นักแสดงนำซีรีส์', 'ตัวละครหลัก', 'นักแสดงสมทบ', 'แขกรับเชิญ', 'ตัวละครรอง', 'บทพิเศษ', 'นักแสดงรับเชิญ', 'บทสำคัญ', 'นักแสดงหลัก']
      : ['นักแสดงนำ', 'ตัวละครสำคัญ', 'นักแสดงสมทบ', 'บทบาทพิเศษ', 'ตัวละครรอง', 'นักแสดงรับเชิญ', 'บทสำคัญ', 'นักแสดงหลัก', 'บทพิเศษ'];
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
      parsed.searchParams.set(key, value);
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
    const safeParams = { autoplay: '0', rel: '0', playsinline: '1' };

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname.startsWith('/embed/')) {
        return appendQuery(url, safeParams);
      }

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
  if (url.includes('drive.google.com') && openMatch?.[1]) {
    return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  }

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
      const embedHost = 'https://iframe.mediadelivery.net';
      const cleanVideoId = videoId.split('?')[0];
      return appendQuery(`${embedHost}/embed/${libraryId}/${cleanVideoId}`, {
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

  if (isHlsUrl(url)) {
    return {
      kind: 'unsupported',
      src: url,
      note: 'ลิงก์นี้เป็น HLS (.m3u8) ถ้าจะใช้ลิงก์นี้โดยตรงต้องเพิ่ม hls.js หรือใช้ Bunny Embed URL แทน',
    };
  }

  return { kind: 'iframe', src: url };
}

function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[22px] bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

function PlayerEmpty({ title, fallbackImage, label }: { title: string; fallbackImage: string; label: string }) {
  return (
    <div className="relative grid aspect-video place-items-center overflow-hidden rounded-[20px] bg-black/58 text-center shadow-[0_24px_90px_rgba(0,0,0,0.72)] backdrop-blur-md md:rounded-[26px]">
      <img
        src={fallbackImage}
        alt={title}
        loading="lazy"
        decoding="async"
        sizes="(max-width: 768px) 92vw, 780px"
        className="absolute inset-0 h-full w-full object-cover opacity-25 blur-[1px]"
      />
      <div className="absolute inset-0 bg-black/62" />
      <div className="relative z-10 px-6">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/[0.1] text-xl font-black text-white/58 shadow-[0_18px_50px_rgba(0,0,0,0.72)] backdrop-blur-xl md:h-16 md:w-16 md:text-2xl">
          ▶
        </div>
        <p className="mt-3 text-xs font-black text-white/72 md:text-sm">{label}</p>
      </div>
    </div>
  );
}

function InlinePlayer({
  url,
  title,
  fallbackImage,
  emptyLabel,
}: {
  url?: string;
  title: string;
  fallbackImage: string;
  emptyLabel: string;
}) {
  const source = playerSource(url);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [source.src]);

  if (source.kind === 'empty' || !source.src) {
    return <PlayerEmpty title={title} fallbackImage={fallbackImage} label={emptyLabel} />;
  }

  if (source.kind === 'unsupported') {
    return (
      <div className="relative grid aspect-video place-items-center overflow-hidden rounded-[20px] bg-black p-5 text-center shadow-[0_24px_90px_rgba(0,0,0,0.72)] md:rounded-[26px]">
        <div>
          <p className="text-sm font-black text-white/78 md:text-base">ยังเล่นลิงก์นี้ใน Player นี้ไม่ได้</p>
          <p className="mt-2 text-xs font-bold leading-5 text-white/50 md:text-sm">{source.note}</p>
          <a
            href={source.src}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#e50914] px-4 text-xs font-black text-white"
          >
            เปิดลิงก์โดยตรง
          </a>
        </div>
      </div>
    );
  }

  if (source.kind === 'video') {
    return (
      <div className="relative overflow-hidden rounded-[20px] bg-black shadow-[0_24px_90px_rgba(0,0,0,0.72)] md:rounded-[26px]">
        <video
          src={source.src}
          className="aspect-video w-full bg-black object-contain"
          controls
          playsInline
          preload="metadata"
          poster={fallbackImage}
          onError={() => setFailed(true)}
        />
        {failed ? (
          <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-black/78 p-3 text-xs font-bold text-white/76 backdrop-blur-xl">
            วิดีโอโหลดไม่ได้จากลิงก์นี้
            <a href={source.src} target="_blank" rel="noreferrer" className="ml-2 font-black text-[#e50914]">
              เปิดลิงก์โดยตรง
            </a>
          </div>
        ) : null}
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
      {failed ? (
        <a
          href={source.src}
          target="_blank"
          rel="noreferrer"
          className="absolute right-3 top-3 rounded-xl bg-black/62 px-3 py-2 text-[11px] font-black text-white/85 backdrop-blur-xl"
        >
          เปิดลิงก์
        </a>
      ) : null}
    </div>
  );
}

function ActorCard({
  person,
  onSelect,
  selected,
}: {
  person: CastPerson;
  onSelect: (person: CastPerson) => void;
  selected: boolean;
}) {
  const canOpen = Boolean(person.id);

  return (
    <button
      type="button"
      onClick={() => canOpen && onSelect(person)}
      disabled={!canOpen}
      className={`group relative aspect-[2/3] min-w-0 overflow-hidden rounded-[12px] bg-white/[0.055] text-left shadow-[0_16px_54px_rgba(0,0,0,0.55)] backdrop-blur-xl transition duration-300 md:rounded-[16px] ${
        selected ? 'ring-1 ring-[#e50914]/80 shadow-glow' : 'hover:-translate-y-1 hover:bg-white/[0.085]'
      } ${canOpen ? '' : 'cursor-not-allowed opacity-60'}`}
      aria-label={`ดูผลงานของ ${person.name}`}
    >
      {person.profileUrl ? (
        <img
          src={person.profileUrl}
          alt={person.name}
          loading="lazy"
          decoding="async"
          sizes="(max-width: 768px) 30vw, 140px"
          className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_24%,#8a111b,#111_62%)] text-4xl font-black text-white/78 md:text-5xl">
          {person.initial || personInitial(person.name)}
        </div>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.06)_44%,rgba(0,0,0,0.92)_100%)]" />
      <div className="absolute left-1.5 top-1.5 rounded-md bg-[#e50914]/92 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_28px_rgba(229,9,20,0.38)] md:left-2.5 md:top-2.5 md:px-2 md:py-1 md:text-[9px]">
        ACTOR
      </div>
      <div className="absolute inset-x-0 bottom-0 p-2 md:p-3">
        <h4 className="line-clamp-2 text-[10px] font-black leading-tight text-white drop-shadow md:text-sm">{person.name}</h4>
        <p className="mt-1 line-clamp-2 text-[8px] font-bold leading-3 text-white/52 md:text-[10px] md:leading-4">
          {person.character || person.role || 'นักแสดง'}
        </p>
        {canOpen ? <p className="mt-1 text-[7px] font-black text-[#e50914] md:text-[9px]">กดดูผลงาน</p> : null}
      </div>
    </button>
  );
}

function StatusBadge({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[9px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md md:text-[11px] ${
        active ? 'bg-[#e50914]/22 text-red-100' : 'bg-white/[0.105] text-white/78'
      }`}
    >
      {children}
    </span>
  );
}

function WatchCta({ hasLink, onClick }: { hasLink: boolean; onClick: () => void }) {
  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={hasLink ? onClick : undefined}
        disabled={!hasLink}
        className={`watch-pulse-btn flex h-12 w-full items-center justify-center rounded-2xl text-sm font-black shadow-[0_18px_60px_rgba(0,0,0,0.48)] backdrop-blur-xl transition md:h-14 md:text-base ${
          hasLink
            ? 'bg-[#e50914] text-white shadow-[0_18px_60px_rgba(229,9,20,0.42)] hover:scale-[1.01]'
            : 'cursor-not-allowed bg-white/[0.075] text-white/38'
        }`}
      >
        {hasLink ? '▶ รับชมเรื่องนี้' : 'ยังไม่มีลิงก์รับชม'}
      </button>
    </div>
  );
}
