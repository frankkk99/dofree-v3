import type { DetailPayload } from '@/lib/tmdb';
import { DetailRecommendationCarousel } from '@/components/detail-recommendation-carousel';

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

function personInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || 'A';
}

function isExternalHref(href: string) {
  return /^https?:\/\//.test(href);
}

function linkProps(href: string) {
  return isExternalHref(href) ? { target: '_blank', rel: 'noreferrer' } : {};
}

function youtubeEmbedUrl(url?: string) {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace('www.', '');

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname.startsWith('/embed/')) {
        parsed.searchParams.set('autoplay', '0');
        parsed.searchParams.set('rel', '0');
        parsed.searchParams.set('playsinline', '1');
        return parsed.toString();
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

function TrailerCard({ title, trailerUrl, fallbackImage }: { title: string; trailerUrl?: string; fallbackImage: string }) {
  const embedUrl = youtubeEmbedUrl(trailerUrl);

  return (
    <section className="rounded-[26px] border border-white/10 bg-white/[0.045] p-3 shadow-[0_28px_90px_rgba(0,0,0,0.62)] backdrop-blur-2xl md:rounded-[32px] md:p-4">
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-red-100/70 md:text-xs">TRAILER PREVIEW</p>
      {embedUrl ? (
        <div className="overflow-hidden rounded-[20px] bg-black shadow-[0_24px_80px_rgba(0,0,0,0.68)] md:rounded-[26px]">
          <iframe
            src={embedUrl}
            title={`ตัวอย่าง ${title}`}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            className="aspect-video w-full border-0 bg-black"
          />
        </div>
      ) : (
        <div className="relative grid aspect-video place-items-center overflow-hidden rounded-[20px] bg-black/58 text-center shadow-[0_24px_80px_rgba(0,0,0,0.68)] md:rounded-[26px]">
          {fallbackImage ? <img src={fallbackImage} alt={title} className="absolute inset-0 h-full w-full object-cover opacity-25 blur-[1px]" /> : null}
          <div className="absolute inset-0 bg-black/68" />
          <div className="relative z-10 px-6">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/[0.1] text-xl font-black text-white/58 shadow-[0_18px_50px_rgba(0,0,0,0.72)] backdrop-blur-xl md:h-16 md:w-16 md:text-2xl">▶</div>
            <p className="mt-3 text-xs font-black text-white/70 md:text-sm">ยังไม่มีตัวอย่างที่ฝังในหน้านี้ได้</p>
          </div>
        </div>
      )}
    </section>
  );
}

export function DetailPageView({ detail }: { detail: DetailPayload }) {
  const { item, cast, trailerUrl, recommendations } = detail;
  const effectiveTrailerUrl = item.trailerUrl || trailerUrl;
  const watchHref = `/watch/${item.mediaType}/${item.id}`;
  const primaryHref = item.watchUrl ? watchHref : effectiveTrailerUrl || '/watch-ready';
  const primaryLabel = item.watchUrl ? 'รับชมในเว็บ' : effectiveTrailerUrl ? 'ดูตัวอย่าง' : 'ดูรายการพร้อมรับชม';
  const secondaryHref = effectiveTrailerUrl || primaryHref;
  const secondaryLabel = effectiveTrailerUrl ? 'Teaser / Trailer' : 'รายละเอียดเพิ่มเติม';
  const fallbackImage = item.backdropUrl || item.posterUrl || '';
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
    image: item.posterUrl,
    genre: item.genres,
    inLanguage: item.language,
    potentialAction: item.watchUrl
      ? {
          '@type': 'WatchAction',
          target: watchHref,
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
    <main className="min-h-screen overflow-x-hidden bg-[#030303] px-2 py-4 text-white md:px-4 md:py-7">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="fixed inset-0 -z-10 bg-[#030303]" />
      <div className="fixed inset-0 -z-10 bg-cover bg-center opacity-28 blur-[1px]" style={{ backgroundImage: `url(${fallbackImage})` }} />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(229,9,20,0.22),transparent_24rem),linear-gradient(180deg,rgba(0,0,0,0.58),#030303_72%)]" />

      <article className="mx-auto w-full max-w-[860px] overflow-hidden rounded-[28px] bg-[#050505]/88 shadow-[0_42px_150px_rgba(0,0,0,0.94)] backdrop-blur-2xl md:rounded-[34px]">
        <section className="relative bg-black/42 shadow-[inset_0_-80px_110px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="absolute inset-0 bg-cover bg-center opacity-24 blur-[1px]" style={{ backgroundImage: `url(${fallbackImage})` }} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.42),rgba(5,5,5,0.86)_55%,rgba(5,5,5,0.98)_100%)] md:bg-[linear-gradient(90deg,rgba(5,5,5,0.98)_0%,rgba(5,5,5,0.86)_42%,rgba(5,5,5,0.48)_100%)]" />

          <a href="/" className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/62 text-xl font-black text-white/80 shadow-[0_14px_42px_rgba(0,0,0,0.72)] backdrop-blur-xl transition hover:bg-white/[0.12] md:right-4 md:top-4 md:h-11 md:w-11 md:text-2xl" aria-label="กลับหน้าแรก">
            ×
          </a>

          <div className="relative z-10 grid grid-cols-[88px_1fr] gap-3 p-4 pt-5 md:grid-cols-[118px_1fr] md:gap-4 md:p-5 md:pb-4">
            <div className="overflow-hidden rounded-[16px] bg-black/40 shadow-[0_20px_55px_rgba(0,0,0,0.75)] ring-1 ring-white/14 backdrop-blur-md md:rounded-[20px]">
              <img src={item.posterUrl} alt={item.title} loading="lazy" decoding="async" className="h-[132px] w-full object-cover md:h-[176px]" />
            </div>

            <div className="min-w-0 pr-9 md:pr-11">
              <a href="/" className="inline-flex rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] font-black text-red-100/75 backdrop-blur-xl transition hover:border-[#e50914]/60 hover:text-white md:text-xs">
                กลับหน้าแรก
              </a>
              <p className="mt-5 text-[9px] font-black uppercase tracking-[0.24em] text-[#e50914] md:text-[10px]">
                {mediaLabel(item.mediaType)} Detail
              </p>
              <h1 className="modal-title mt-1.5 line-clamp-2 text-[21px] font-black leading-[0.98] tracking-[-0.06em] text-white md:text-[31px]">
                {item.title}
              </h1>
              {item.titleEn && item.titleEn !== item.title ? <p className="mt-2 text-sm font-bold text-white/42 md:text-base">{item.titleEn}</p> : null}

              <div className="mt-4 flex flex-wrap gap-1.5 text-[9px] font-black md:text-[11px]">
                {detailFacts.map((fact) => (
                  <span key={fact} className="rounded-full bg-white/[0.105] px-2.5 py-1 text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md">
                    {fact}
                  </span>
                ))}
              </div>

              <p className="mt-3 line-clamp-3 max-w-2xl text-[11px] font-medium leading-4 text-white/58 md:text-[13px] md:leading-5">
                {item.overview || 'ยังไม่มีคำอธิบายเรื่องนี้ แต่ระบบเตรียมโครงหน้าไว้สำหรับแสดงรายละเอียด ตัวอย่าง นักแสดง และรายการแนะนำที่เกี่ยวข้อง'}
              </p>

              {item.genres?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.genres.map((genre) => (
                    <span key={genre} className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[11px] font-bold text-white/58 backdrop-blur-xl">
                      {genre}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2.5 md:gap-3">
                <a {...linkProps(primaryHref)} href={primaryHref} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#e50914] px-5 text-xs font-black text-white shadow-glow transition hover:brightness-110 md:h-12 md:px-7 md:text-sm">
                  <span>▶</span>{primaryLabel}
                </a>
                <a {...linkProps(secondaryHref)} href={secondaryHref} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/18 bg-white/[0.08] px-5 text-xs font-black text-white/85 transition hover:border-white/30 hover:bg-white/[0.13] md:h-12 md:px-7 md:text-sm">
                  <span>▷</span>{secondaryLabel}
                </a>
                <a href="/watch-ready" className="inline-flex h-11 items-center justify-center rounded-xl border border-[#e50914]/30 bg-[#e50914]/10 px-5 text-xs font-black text-red-100 transition hover:border-[#e50914]/60 hover:bg-[#e50914]/18 md:h-12 md:px-7 md:text-sm">
                  พร้อมรับชมทั้งหมด
                </a>
              </div>
            </div>
          </div>

          <div className="relative z-10 px-4 pb-4 md:px-5 md:pb-5">
            <TrailerCard title={item.title} trailerUrl={effectiveTrailerUrl} fallbackImage={fallbackImage} />
          </div>
        </section>

        <section className="sticky top-0 z-20 bg-black/62 px-3 shadow-[0_20px_60px_rgba(0,0,0,0.58)] backdrop-blur-2xl md:px-5">
          <div className="movie-rail flex gap-1 overflow-x-auto py-2.5 md:gap-1.5 md:py-3">
            {[
              { label: 'แนะนำ', href: '#recommend' },
              { label: 'นักแสดง', href: '#cast' },
              { label: 'รายละเอียด', href: '#detail' },
              { label: 'สปอยหนัง', href: '#spoiler' },
              { label: 'รับชม', href: watchHref },
            ].map((tab, index) => (
              <a key={tab.label} href={tab.href} className={`min-w-max rounded-md px-3 py-1.5 text-[10px] font-black shadow-[0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl transition md:px-4 md:py-2 md:text-xs ${index === 0 ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/55 hover:bg-white/[0.12] hover:text-white'}`}>
                {tab.label}
              </a>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-6 p-3 md:p-4">
          <div id="cast" className="order-2 rounded-[22px] bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#e50914]/75">Cast</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.04em] md:text-2xl">นักแสดงหลัก</h2>
              </div>
              <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-black text-white/38 backdrop-blur-xl">TMDB</span>
            </div>

            {cast.length ? (
              <div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-3">
                {cast.slice(0, 12).map((person, index) => (
                  <div key={`${person.id || person.name}-${index}`} className="relative aspect-[2/3] overflow-hidden rounded-[12px] bg-white/[0.055] shadow-[0_16px_54px_rgba(0,0,0,0.55)] backdrop-blur-xl md:rounded-[16px]">
                    {person.profileUrl ? <img src={person.profileUrl} alt={person.name} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_24%,#8a111b,#111_62%)] text-4xl font-black text-white/78 md:text-5xl">{personInitial(person.name)}</div>}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.06)_44%,rgba(0,0,0,0.92)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 p-2 md:p-3">
                      <h3 className="line-clamp-2 text-[10px] font-black leading-tight text-white drop-shadow md:text-sm">{person.name}</h3>
                      <p className="mt-1 line-clamp-2 text-[8px] font-bold leading-3 text-white/52 md:text-[10px] md:leading-4">{person.character || 'นักแสดง'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-black/28 p-4 text-center text-xs font-bold text-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-xl md:text-sm">ยังไม่มีข้อมูลนักแสดงสำหรับเรื่องนี้</div>
            )}
          </div>

          <div id="detail" className="order-3 rounded-[22px] bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-5">
            <h2 className="text-xl font-black tracking-[-0.04em] md:text-2xl">เกี่ยวกับเรื่องนี้</h2>
            <div className="mt-3 grid gap-2 text-[11px] font-bold text-white/62 sm:grid-cols-2 md:mt-4 md:gap-3 md:text-sm">
              <p>ประเภท: {(item.genres || []).join(', ') || 'ภาพยนตร์'}</p>
              <p>ความยาว: {item.runtime ? `${item.runtime} นาที` : 'ยังไม่มีข้อมูล'}</p>
              <p>วันฉาย: {item.year}</p>
              <p>ภาษา: {item.language === 'th' ? 'ไทย' : item.language || 'ไม่ระบุ'}</p>
              <p>สถานะ: {statusLabel(item.status, item.isWatchReady)}</p>
              <p>คะแนน: {item.rating.toFixed(1)} / 10</p>
            </div>
            <p className="mt-4 text-xs leading-6 text-white/58 md:text-sm md:leading-7">{item.overview}</p>
          </div>

          <div id="spoiler" className="order-4 rounded-[22px] bg-yellow-300/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-5">
            <h2 className="text-xl font-black tracking-[-0.04em] md:text-2xl">สปอยหนัง</h2>
            <div className="mt-3 rounded-2xl bg-black/28 p-3 text-xs leading-6 text-yellow-50/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:text-sm md:leading-7">
              {item.overview || 'ยังไม่มีสปอยสำหรับเรื่องนี้'}
            </div>
          </div>

          <div id="recommend" className="order-1 rounded-[22px] bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#e50914]/75">Recommended</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.04em] md:text-2xl">แนะนำสำหรับคุณ</h2>
              </div>
              <a href="/watch-ready" className="shrink-0 text-xs font-black text-white/45 hover:text-white md:text-sm">ดูทั้งหมด ›</a>
            </div>

            <DetailRecommendationCarousel current={item} items={recommendations} />
          </div>
        </section>
      </article>
    </main>
  );
}
