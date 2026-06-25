import type { DetailPayload } from '@/lib/tmdb';
import { MovieCard } from '@/components/movie-card';
import { absoluteUrl, seoConfig } from '@/lib/seo';

function statusLabel(status?: string, isWatchReady?: boolean) {
  if (isWatchReady || status === 'published') return 'พร้อมรับชม';
  if (status === 'review') return 'กำลังตรวจสอบ';
  if (status === 'draft') return 'ตัวอย่างข้อมูล';
  if (status === 'broken') return 'ลิงก์มีปัญหา';
  if (status === 'hidden') return 'ซ่อนจากหน้าเว็บ';
  return 'Preview';
}

function mediaLabel(mediaType: string) {
  return mediaType === 'tv' ? 'Series' : 'Movie';
}

function isExternalHref(href: string) {
  return /^https?:\/\//.test(href);
}

function linkProps(href: string) {
  return isExternalHref(href) ? { target: '_blank', rel: 'noreferrer' } : {};
}

function personInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || 'A';
}

export function DetailPageView({ detail }: { detail: DetailPayload }) {
  const { item, cast, trailerUrl, recommendations } = detail;
  const effectiveTrailerUrl = item.trailerUrl || trailerUrl;
  const watchHref = `/watch/${item.mediaType}/${item.id}`;
  const primaryHref = item.watchUrl ? watchHref : effectiveTrailerUrl || '/watch-ready';
  const primaryLabel = item.watchUrl ? 'รับชมในเว็บ' : effectiveTrailerUrl ? 'ดูตัวอย่าง' : 'ดูรายการพร้อมรับชม';
  const secondaryHref = effectiveTrailerUrl || primaryHref;
  const secondaryLabel = effectiveTrailerUrl ? 'Teaser / Trailer' : 'รายละเอียดเพิ่มเติม';
  const detailFacts = [
    item.year,
    `คะแนน ${item.rating.toFixed(1)}`,
    item.runtime ? `${item.runtime} นาที` : null,
    statusLabel(item.status, item.isWatchReady),
  ].filter(Boolean);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': item.mediaType === 'tv' ? 'TVSeries' : 'Movie',
    name: item.title,
    alternateName: item.titleEn,
    description: item.overview,
    datePublished: item.year,
    image: [item.posterUrl, item.backdropUrl].filter(Boolean),
    genre: item.genres,
    inLanguage: item.language,
    url: absoluteUrl(`/${item.mediaType}/${item.id}`),
    isAccessibleForFree: true,
    publisher: {
      '@type': 'Organization',
      name: seoConfig.siteName,
      url: absoluteUrl('/'),
    },
    potentialAction: item.watchUrl
      ? {
          '@type': 'WatchAction',
          target: absoluteUrl(watchHref),
        }
      : undefined,
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
    <main className="min-h-screen overflow-x-hidden bg-[#030303] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="relative min-h-[660px] overflow-hidden border-b border-white/10 md:min-h-[720px]">
        <div className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: `url(${item.backdropUrl})` }} />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#030303_0%,rgba(3,3,3,0.97)_22%,rgba(3,3,3,0.62)_58%,#030303_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(3,3,3,0.72)_64%,#030303_98%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_36%,rgba(229,9,20,0.22),transparent_24rem)]" />

        <div className="relative z-10 mx-auto flex min-h-[660px] max-w-[1440px] items-center px-4 py-24 md:min-h-[720px] md:px-6 md:py-28">
          <div className="grid w-full gap-7 md:grid-cols-[280px_1fr] md:items-center lg:grid-cols-[340px_1fr]">
            <div className="mx-auto w-[190px] overflow-hidden rounded-[20px] border border-white/12 bg-white/[0.045] shadow-[0_35px_100px_rgba(0,0,0,0.86)] sm:w-[240px] md:w-full md:rounded-[26px]">
              <img src={item.posterUrl} alt={item.title} className="aspect-[2/3] w-full object-cover" />
            </div>

            <div className="max-w-4xl text-center md:text-left">
              <a href="/" className="inline-flex rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs font-black text-red-100/75 backdrop-blur-xl transition hover:border-[#e50914]/60 hover:text-white">
                กลับหน้าแรก
              </a>

              <p className="mt-7 text-[10px] font-black uppercase tracking-[0.34em] text-[#e50914] md:text-xs">
                {mediaLabel(item.mediaType)} Detail
              </p>

              <h1 className="mt-3 text-[42px] font-black leading-[0.9] tracking-[-0.085em] text-white md:text-7xl lg:text-8xl">
                {item.title}
              </h1>

              {item.titleEn && item.titleEn !== item.title ? (
                <p className="mt-3 text-sm font-bold text-white/40 md:text-lg">{item.titleEn}</p>
              ) : null}

              <div className="mt-5 flex flex-wrap justify-center gap-2 text-[11px] font-black text-white/72 md:justify-start md:text-xs">
                {detailFacts.map((fact) => (
                  <span key={fact} className="rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-xl">
                    {fact}
                  </span>
                ))}
              </div>

              <p className="mx-auto mt-6 max-w-3xl text-sm leading-7 text-white/62 md:mx-0 md:text-lg md:leading-9">
                {item.overview || 'ยังไม่มีคำอธิบายเรื่องนี้ แต่ระบบเตรียมโครงหน้าไว้สำหรับแสดงรายละเอียด ตัวอย่าง นักแสดง และรายการแนะนำที่เกี่ยวข้อง'}
              </p>

              {item.genres?.length ? (
                <div className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
                  {item.genres.map((genre) => (
                    <span key={genre} className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-bold text-white/58 backdrop-blur-xl">
                      {genre}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start md:gap-4">
                <a {...linkProps(primaryHref)} href={primaryHref} className="inline-flex h-[52px] items-center justify-center gap-3 rounded-xl bg-[#e50914] px-7 text-sm font-black text-white shadow-glow transition hover:brightness-110 md:px-8">
                  <span>▶</span>{primaryLabel}
                </a>
                <a {...linkProps(secondaryHref)} href={secondaryHref} className="inline-flex h-[52px] items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.1] px-7 text-sm font-black text-white/85 transition hover:border-white/22 hover:bg-white/[0.15] md:px-8">
                  <span>▷</span>{secondaryLabel}
                </a>
                <a href="/watch-ready" className="inline-flex h-[52px] items-center justify-center rounded-xl border border-[#e50914]/30 bg-[#e50914]/10 px-7 text-sm font-black text-red-100 transition hover:border-[#e50914]/60 hover:bg-[#e50914]/18 md:px-8">
                  พร้อมรับชมทั้งหมด
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] space-y-12 px-4 py-10 md:px-6 md:py-12">
        <div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e50914]/75">Cast</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] md:text-3xl">นักแสดงหลัก</h2>
            </div>
          </div>

          {cast.length ? (
            <div className="movie-rail mt-5 flex gap-3 overflow-x-auto pb-3 md:gap-4">
              {cast.map((person) => (
                <div key={person.id} className="w-[138px] shrink-0 rounded-2xl border border-white/10 bg-white/[0.045] p-2.5 backdrop-blur-xl md:w-[160px] md:p-3">
                  <div className="aspect-square overflow-hidden rounded-xl bg-white/10">
                    {person.profileUrl ? (
                      <img src={person.profileUrl} alt={person.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-3xl font-black text-white/38">{personInitial(person.name)}</div>
                    )}
                  </div>
                  <h3 className="mt-3 line-clamp-1 text-sm font-black">{person.name}</h3>
                  <p className="mt-1 line-clamp-1 text-xs text-white/45">{person.character || 'นักแสดง'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm font-semibold text-white/45">
              ยังไม่มีข้อมูลนักแสดงสำหรับเรื่องนี้
            </div>
          )}
        </div>

        <div>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e50914]/75">Recommended</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] md:text-3xl">แนะนำสำหรับคุณ</h2>
            </div>
            <a href="/watch-ready" className="shrink-0 text-sm font-black text-white/45 hover:text-white">ดูทั้งหมด ›</a>
          </div>

          {recommendations.length ? (
            <div className="movie-rail flex gap-3 overflow-x-auto pb-4 md:gap-5">
              {recommendations.slice(0, 12).map((movie, index) => (
                <MovieCard key={`${movie.mediaType}-${movie.id}-${index}`} item={movie} priorityBadge={index % 3 === 0 ? 'ใหม่' : undefined} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm font-semibold text-white/45">
              ยังไม่มีรายการแนะนำเพิ่มเติม
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
