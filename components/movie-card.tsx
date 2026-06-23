import type { MovieItem } from '@/lib/tmdb';

export function MovieCard({ item }: { item: MovieItem }) {
  return (
    <article className="group relative w-[152px] shrink-0 overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.04] shadow-2xl transition duration-300 hover:-translate-y-1 hover:border-red-500/55 md:w-[190px]">
      <div className="aspect-[2/3] overflow-hidden bg-neutral-900">
        <div
          className="h-full w-full bg-cover bg-center transition duration-500 group-hover:scale-110"
          style={{ backgroundImage: `url(${item.posterUrl})` }}
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/78 to-transparent p-3 pt-14">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {item.label ? <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">{item.label}</span> : null}
          {item.isWatchReady ? <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-black">พร้อมดู</span> : null}
          <span className="rounded-full bg-yellow-400/90 px-2 py-0.5 text-[10px] font-black text-black">★ {item.rating.toFixed(1)}</span>
        </div>
        <h3 className="line-clamp-2 text-sm font-black text-white">{item.title}</h3>
        <p className="mt-1 text-[11px] text-white/48">{item.year} • {item.genres?.[0] || 'Movie'}</p>
      </div>
    </article>
  );
}
