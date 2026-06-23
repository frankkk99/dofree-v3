import type { MovieItem } from '@/lib/tmdb';

type MovieCardProps = {
  item: MovieItem;
  priorityBadge?: string;
};

export function MovieCard({ item, priorityBadge }: MovieCardProps) {
  const badge = priorityBadge || item.label;

  return (
    <article className="group relative h-[250px] w-[150px] shrink-0 overflow-hidden rounded-[10px] border border-white/[0.08] bg-[#111] shadow-[0_24px_70px_rgba(0,0,0,0.65)] transition duration-300 hover:-translate-y-1 hover:border-[#e50914]/70 hover:shadow-glow md:h-[280px] md:w-[180px] xl:h-[300px] xl:w-[196px]">
      <div
        className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-110"
        style={{ backgroundImage: `url(${item.posterUrl})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.08)_45%,rgba(0,0,0,0.88)_100%)]" />

      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
        {badge ? (
          <span className={`${badge === 'พรีเมียม' ? 'bg-black/55 text-[#f4c46b]' : 'bg-[#e50914] text-white'} rounded-md px-2 py-1 text-[11px] font-black shadow-lg backdrop-blur-md`}>
            {badge === 'พรีเมียม' ? '♛ พรีเมียม' : badge}
          </span>
        ) : null}
        {item.isWatchReady ? <span className="rounded-md bg-black/55 px-2 py-1 text-[11px] font-black text-white/90 backdrop-blur-md">HD</span> : null}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-3.5">
        <h3 className="line-clamp-2 text-[14px] font-black leading-tight text-white drop-shadow md:text-[15px]">{item.title}</h3>
        <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-white/58">
          <span className="text-[#f4c46b]">★ {item.rating.toFixed(1)}</span>
          <span>•</span>
          <span>{item.year}</span>
        </div>
      </div>
    </article>
  );
}
