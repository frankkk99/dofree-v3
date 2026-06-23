'use client';

import type { MovieItem } from '@/lib/tmdb';

type MovieCardProps = {
  item: MovieItem;
  priorityBadge?: string;
  onSelect?: (item: MovieItem) => void;
  compact?: boolean;
};

function statusBadge(item: MovieItem, priorityBadge?: string) {
  if (priorityBadge) return priorityBadge;
  if (item.isWatchReady) return 'พร้อมดู';
  if (item.rating >= 8) return '8+';
  return item.label;
}

export function MovieCard({ item, priorityBadge, onSelect, compact = false }: MovieCardProps) {
  const badge = statusBadge(item, priorityBadge);
  const href = `/${item.mediaType}/${item.id}`;
  const badges = item.badges?.length ? item.badges : [badge, item.isWatchReady ? 'HD' : undefined].filter(Boolean) as string[];
  const cardClass = `${compact ? 'h-[228px] w-[145px] md:h-[260px] md:w-[170px]' : 'h-[250px] w-[150px] md:h-[280px] md:w-[180px] xl:h-[300px] xl:w-[196px]'} group relative shrink-0 overflow-hidden rounded-[10px] border border-white/[0.08] bg-[#111] text-left shadow-[0_24px_70px_rgba(0,0,0,0.65)] transition duration-300 hover:-translate-y-1 hover:border-[#e50914]/80 hover:shadow-glow`;
  const content = (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-110"
        style={{ backgroundImage: `url(${item.posterUrl})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.1)_0%,rgba(0,0,0,0.05)_45%,rgba(0,0,0,0.92)_100%)]" />

      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 pr-2">
        {badges.slice(0, 3).map((name) => (
          <span
            key={name}
            className={`${name === 'พรีเมียม' ? 'bg-black/60 text-[#f4c46b]' : name === 'HD' ? 'bg-black/60 text-white/90' : name === '8+' ? 'bg-[#e50914] text-white' : 'bg-[#e50914] text-white'} rounded-md px-2 py-1 text-[10px] font-black shadow-lg backdrop-blur-md`}
          >
            {name === 'พรีเมียม' ? '♛ พรีเมียม' : name}
          </span>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-3.5">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/42">
          <span>{item.mediaType === 'tv' ? 'Series' : 'Movie'}</span>
          <span>•</span>
          <span>{item.status === 'published' ? 'Watch Ready' : item.status || 'Preview'}</span>
        </div>
        <h3 className="line-clamp-2 text-[14px] font-black leading-tight text-white drop-shadow md:text-[15px]">{item.title}</h3>
        <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-white/58">
          <span className="text-[#f4c46b]">★ {item.rating.toFixed(1)}</span>
          <span>•</span>
          <span>{item.year}</span>
        </div>
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button type="button" className={cardClass} onClick={() => onSelect(item)} aria-label={`เปิดรายละเอียด ${item.title}`}>
        {content}
      </button>
    );
  }

  return (
    <a className={cardClass} href={href} aria-label={`ดูรายละเอียด ${item.title}`}>
      {content}
    </a>
  );
}
