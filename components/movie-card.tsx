'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { MovieItem } from '@/lib/tmdb';
import { releaseMonthYear } from '@/lib/release-date';
import { canUseNextImage, normalizeMovieImageUrl } from '@/lib/image-optimizer';

type MovieCardProps = {
  item: MovieItem;
  priorityBadge?: string;
  onSelect?: (item: MovieItem) => void;
  compact?: boolean;
  grid?: boolean;
  priority?: boolean;
};

function statusBadge(item: MovieItem, priorityBadge?: string) {
  if (priorityBadge) return priorityBadge;
  if (item.isWatchReady) return 'พร้อมดู';
  if (item.rating >= 8) return '8+';
  return item.label;
}

export function MovieCard({ item, priorityBadge, onSelect, compact = false, grid = false, priority = false }: MovieCardProps) {
  const badge = statusBadge(item, priorityBadge);
  const href = `/${item.mediaType}/${item.id}`;
  const releaseLabel = releaseMonthYear(item as MovieItem & { releaseDate?: string });
  const badges = item.badges?.length ? item.badges : [badge, item.isWatchReady || Boolean((item as Record<string, unknown>)['watch' + 'Url']) ? 'HD' : 'ข้อมูล'].filter(Boolean) as string[];
  const sizeClass = grid
    ? 'aspect-[2/3] h-auto w-full min-w-0'
    : compact
      ? 'h-[158px] w-[104px] sm:h-[206px] sm:w-[132px] md:h-[260px] md:w-[170px]'
      : 'h-[176px] w-[116px] sm:h-[220px] sm:w-[140px] md:h-[280px] md:w-[180px] xl:h-[300px] xl:w-[196px]';
  const cardClass = `${sizeClass} group relative ${grid ? '' : 'shrink-0'} overflow-hidden rounded-[8px] border border-white/[0.07] bg-[#111] text-left shadow-[0_16px_44px_rgba(0,0,0,0.62)] transition duration-300 hover:-translate-y-1 hover:border-[#e50914]/80 hover:shadow-glow md:rounded-[10px] md:shadow-[0_24px_70px_rgba(0,0,0,0.65)]`;
  const rawImageUrl = item.posterUrl || item.backdropUrl;
  const normalizedImageUrl = normalizeMovieImageUrl(rawImageUrl, item.posterUrl ? 'poster' : 'backdrop');
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = imageFailed ? '' : normalizedImageUrl;
  const optimizeImage = canUseNextImage(imageUrl);

  useEffect(() => {
    setImageFailed(false);
  }, [normalizedImageUrl]);

  const content = (
    <>
      {imageUrl && optimizeImage ? (
        <Image
          src={imageUrl}
          alt={item.title}
          fill
          priority={priority}
          sizes={grid ? '(max-width: 640px) 25vw, (max-width: 1024px) 16vw, 12vw' : compact ? '(max-width: 640px) 104px, 170px' : '(max-width: 640px) 116px, 196px'}
          className="object-cover object-center transition duration-700 group-hover:scale-110"
          onError={() => setImageFailed(true)}
        />
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt={item.title}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'low'}
          sizes={grid ? '(max-width: 640px) 25vw, (max-width: 1024px) 16vw, 12vw' : compact ? '(max-width: 640px) 104px, 170px' : '(max-width: 640px) 116px, 196px'}
          className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 group-hover:scale-110"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(229,9,20,0.28),#111_62%)]" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05)_0%,rgba(0,0,0,0.0)_42%,rgba(0,0,0,0.9)_100%)]" />

      <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1 pr-1 md:left-3 md:top-3 md:gap-1.5 md:pr-2">
        {badges.slice(0, 2).map((name) => (
          <span
            key={name}
            className={`${name === 'พรีเมียม' ? 'bg-black/60 text-[#f4c46b]' : name === 'HD' ? 'bg-black/60 text-white/90' : name === '8+' ? 'bg-[#e50914] text-white' : 'bg-[#e50914] text-white'} rounded px-1.5 py-0.5 text-[7px] font-black shadow-lg backdrop-blur-md md:rounded-md md:px-2 md:py-1 md:text-[10px]`}
          >
            {name === 'พรีเมียม' ? '♛' : name}
          </span>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-2 md:p-3.5">
        <h3 className="line-clamp-2 text-[9px] font-black leading-tight text-white drop-shadow sm:text-[11px] md:text-[15px]">{item.title}</h3>
        <div className="mt-1 flex items-center gap-1 text-[8px] font-bold text-white/58 md:mt-2 md:gap-2 md:text-[11px]">
          <span className="text-[#f4c46b]">★ {item.rating.toFixed(1)}</span>
          <span>•</span>
          <span>{releaseLabel}</span>
        </div>
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button type="button" className={cardClass} onClick={() => onSelect(item)} aria-label={`เปิดรายละเอียด ${item.title}`} style={{ contentVisibility: 'auto', containIntrinsicSize: grid ? '260px 180px' : '300px 196px' }}>
        {content}
      </button>
    );
  }

  return (
    <a className={cardClass} href={href} aria-label={`ดูรายละเอียด ${item.title}`} style={{ contentVisibility: 'auto', containIntrinsicSize: grid ? '260px 180px' : '300px 196px' }}>
      {content}
    </a>
  );
}
