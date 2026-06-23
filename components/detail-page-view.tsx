import type { DetailPayload } from '@/lib/tmdb';
import { MovieCard } from '@/components/movie-card';

export function DetailPageView({ detail }: { detail: DetailPayload }) {
  const { item, cast, trailerUrl, recommendations } = detail;
  const primaryHref = item.watchUrl || trailerUrl || '/watch-ready';
  const primaryLabel = item.watchUrl ? 'รับชมหนัง' : trailerUrl ? 'ดูตัวอย่าง' : 'ยังไม่มีลิงก์รับชม';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': item.mediaType === 'tv' ? 'TVSeries' : 'Movie',
    name: item.title,
    description: item.overview,
    datePublished: item.year,
    image: item.posterUrl,
    aggregateRating: item.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: item.rating.toFixed(1),
          ratingCount: 1000,
          bestRating: 10,
        }
      : undefined,
  };

  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="relative min-h-[720px] overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-cover bg-center opacity-85" style={{ backgroundImage: `url(${item.backdropUrl})` }} />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#030303_0%,rgba(3,3,3,0.95)_25%,rgba(3,3,3,0.45)_62%,#030303_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.15),#030303_96%)]" />

        <div className="relative z-10 mx-auto flex min-h-[720px] max-w-[1440px] items-center px-6 py-28">
          <div className="grid w-full gap-8 md:grid-cols-[320px_1fr] md:items-center">
            <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04] shadow-[0_35px_100px_rgba(0,0,0,0.8)]">
              <img src={item.posterUrl} alt={item.title} className="aspect-[2/3] w-full object-cover" />
            </div>
            <div>
              <a href="/" className="text-sm font-black text-red-200/75 hover:text-red-100">← กลับหน้าแรก</a>
              <p className="mt-6 text-xs font-black uppercase tracking-[0.32em] text-[#e50914]">{item.mediaType === 'tv' ? 'Series Detail' : 'Movie Detail'}</p>
              <h1 className="mt-3 text-5xl font-black tracking-[-0.08em] md:text-7xl">{item.title}</h1>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-black text-white/72">
                <span className="rounded-full bg-white/10 px-3 py-1">{item.year}</span>
                <span className="rounded-full bg-white/10 px-3 py-1">★ {item.rating.toFixed(1)}</span>
                {item.runtime ? <span className="rounded-full bg-white/10 px-3 py-1">{item.runtime} นาที</span> : null}
                <span className="rounded-full bg-white/10 px-3 py-1">{item.status === 'published' ? 'พร้อมรับชม' : item.status || 'preview'}</span>
              </div>
              <p className="mt-6 max-w-3xl text-lg leading-9 text-white/65">{item.overview}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {(item.genres || []).map((genre) => <span key={genre} className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-bold text-white/58">{genre}</span>)}
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href={primaryHref} className="inline-flex h-13 items-center gap-3 rounded-xl bg-[#e50914] px-8 text-sm font-black text-white shadow-glow"><span>▶</span>{primaryLabel}</a>
                <a href={trailerUrl || primaryHref} className="inline-flex h-13 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.1] px-8 text-sm font-black text-white/85"><span>▷</span>Teaser</a>
                <a href="/watch-ready" className="inline-flex h-13 items-center gap-3 rounded-xl border border-[#e50914]/30 bg-[#e50914]/10 px-8 text-sm font-black text-red-100">พร้อมรับชมทั้งหมด</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] space-y-12 px-6 py-10">
        <div>
          <h2 className="text-2xl font-black tracking-[-0.04em]">นักแสดงหลัก</h2>
          <div className="movie-rail mt-5 flex gap-4 overflow-x-auto pb-3">
            {cast.length ? cast.map((person) => (
              <div key={person.id} className="w-[150px] shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="aspect-square overflow-hidden rounded-xl bg-white/10">
                  {person.profileUrl ? <img src={person.profileUrl} alt={person.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-3xl">👤</div>}
                </div>
                <h3 className="mt-3 line-clamp-1 text-sm font-black">{person.name}</h3>
                <p className="mt-1 line-clamp-1 text-xs text-white/45">{person.character || 'นักแสดง'}</p>
              </div>
            )) : <p className="text-white/45">ยังไม่มีข้อมูลนักแสดง</p>}
          </div>
        </div>

        <div>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-[-0.04em]">แนะนำสำหรับคุณ</h2>
            <a href="/watch-ready" className="text-sm font-black text-white/45 hover:text-white">ดูทั้งหมด ›</a>
          </div>
          <div className="movie-rail flex gap-5 overflow-x-auto pb-4">
            {recommendations.slice(0, 12).map((movie, index) => <MovieCard key={`${movie.mediaType}-${movie.id}-${index}`} item={movie} priorityBadge={index % 3 === 0 ? 'ใหม่' : undefined} />)}
          </div>
        </div>
      </section>
    </main>
  );
}
