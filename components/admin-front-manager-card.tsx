import type { AdminFrontItem } from '@/components/admin-front-manager-types';
import { adminFrontItemName, adminFrontStatusLabel } from '@/components/admin-front-manager-types';

type Props = {
  item: AdminFrontItem;
  onSelect: (item: AdminFrontItem) => void;
};

function badges(item: AdminFrontItem) {
  const list = [adminFrontStatusLabel(item)];
  if (!item.watch_url) list.push('ไม่มีลิงก์');
  if (!item.poster_url) list.push('ไม่มี poster');
  if (item.media_type === 'tv') list.push('ซีรีส์');
  return Array.from(new Set(list)).slice(0, 4);
}

export function AdminFrontManagerCard({ item, onSelect }: Props) {
  const name = adminFrontItemName(item);
  const imageUrl = item.poster_url || item.backdrop_url || '';

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="group relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/10 bg-[#111] text-left shadow-[0_18px_48px_rgba(0,0,0,0.62)] transition hover:-translate-y-1 hover:border-[#e50914]/80"
      aria-label={`แก้ไข ${name}`}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '300px 200px' }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={name} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110" />
      ) : (
        <div className="absolute inset-0 bg-white/[0.05]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/10 to-black/95" />
      <div className="absolute left-2 top-2 flex flex-wrap gap-1 pr-2">
        {badges(item).map((badge) => (
          <span key={badge} className="rounded-md bg-black/65 px-2 py-1 text-[9px] font-black text-white ring-1 ring-white/10 backdrop-blur-md">{badge}</span>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3">
        <h3 className="line-clamp-2 text-sm font-black leading-tight text-white md:text-[15px]">{name}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-white/68">
          <span className="text-[#f4c46b]">★ {Number(item.rating || 0).toFixed(1)}</span>
          <span>•</span>
          <span>{item.year || '-'}</span>
          <span>•</span>
          <span>{item.media_type}</span>
        </div>
        <p className="mt-1 truncate text-[10px] font-bold text-white/42">{item.section_slug || item.source_bucket || '-'}</p>
      </div>
    </button>
  );
}
