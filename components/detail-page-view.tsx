import type { ReactNode } from 'react';
import type { DetailPayload } from '@/lib/tmdb';
import { DetailRecommendationCarousel } from '@/components/detail-recommendation-carousel';
import { DetailReportButton } from '@/components/detail-report-button';
import { absoluteUrl, siteName } from '@/lib/seo';

const DETAIL_LAYOUT_VERSION = 'modal-visual-page-v4';

const detailTabs = [
  { label: 'แนะนำ', href: '#recommend' },
  { label: 'นักแสดง', href: '#cast' },
  { label: 'รายละเอียด', href: '#detail' },
  { label: 'เรื่องย่อ', href: '#summary' },
] as const;

function statusLabel(status?: string, isWatchReady?: boolean) {
  if (isWatchReady || status === 'published') return 'พร้อมรับชม';
  if (status === 'review') return 'กำลังตรวจสอบ';
  if (status === 'draft') return 'ตัวอย่างข้อมูล';
  if (status === 'broken') return 'ลิงก์มีปัญหา';
  if (status === 'hidden') return 'ซ่อนจากหน้าเว็บ';
  return 'ข้อมูล';
}

function mediaLabel(mediaType: string) {
  return mediaType === 'tv' ? 'ซีรีส์' : 'ภาพยนตร์';
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

function StatusBadge({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[9px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md md:text-[11px] ${active ? 'bg-[#e50914]/22 text-red-100' : 'bg-white/[0.105] text-white/78'}`}>
      {children}
    </span>
  );
}

function SectionSurface({ id, children, className = '' }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`rounded-[22px] bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-5 ${className}`}>
      {children}
    </section>
  );
}

function TrailerCard({ title, trailerUrl, fallbackImage }: { title: string; trailerUrl?: string; fallbackImage: string }) {
  const embedUrl = youtubeEmbedUrl(trailerUrl);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100/68 md:text-xs">Trailer Preview</p>
        <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[9px] font-black text-white/42 backdrop-blur-xl md:text-[10px]">ตัวอย่าง</span>
      </div>
      {embedUrl ? (
        <div className="overflow-hidden rounded-[20px] bg-black shadow-[0_24px_90px_rgba(0,0,0,0.72)] md:rounded-[26px]">
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
        <div className="relative grid aspect-video place-items-center overflow-hidden rounded-[20px] bg-black/58 text-center shadow-[0_24px_90px_rgba(0,0,0,0.72)] md:rounded-[26px]">
          {fallbackImage ? <img src={fallbackImage} alt={title} className="absolute inset-0 h-full w-full object-cover opacity-25 blur-[1px]" /> : null}
          <div className="absolute inset-0 bg-black/62" />
          <div className="relative z-10 px-6">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/[0.1] text-xl font-black text-white/58 shadow-[0_18px_50px_rgba(0,0,0,0.72)] backdrop-blur-xl md:h-16 md:w-16 md:text-2xl">▶</div>
            <p className="mt-3 text-xs font-black text-white/72 md:text-sm">ยังไม่มีตัวอย่างที่ฝังในหน้านี้ได้</p>
          </div>
        </div>
      )}
    </section>
  );
}

function WatchReadyPanel({
  title,
  tmdbId,
  mediaType,
  fallbackImage,
  watchHref,
  hasWatchLink,
}: {
  title: string;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  fallbackImage: string;
  watchHref: string;
  hasWatchLink: boolean;
}) {
  return (
    <section id="watch-ready" className="overflow-hidden rounded-[24px] border border-[#e50914]/18 bg-[linear-gradient(135deg,rgba(229,9,20,0.16),rgba(255,255,255,0.045))] shadow-[0_26px_95px_rgba(0,0,0,0.58)] backdrop-blur-xl md:rounded-[28px]">
      <div className="relative min-h-[168px] p-5 md:min-h-[190px] md:p-6">
        {fallbackImage ? <img src={fallbackImage} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-18 blur-[1px]" /> : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,5,0.97),rgba(5,5,5,0.8)_56%,rgba(5,5,5,0.62)),radial-gradient(circle_at_82%_20%,rgba(229,9,20,0.26),transparent_24rem)]" />
        <div className="relative z-10 flex min-h-[128px] flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-100/72">WATCH READY</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white md:text-4xl">พร้อมรับชม</h2>
            <p className="mt-2 max-w-2xl text-xs font-semibold leading-5 text-white/58 md:text-sm md:leading-6">
              {hasWatchLink ? `เปิดหน้าเล่นของ ${title} แล้วเริ่มรับชมได้ทันที` : 'เรื่องนี้ยังไม่มีลิงก์เล่นตรงในระบบตอนนี้ สามารถดูรายการพร้อมรับชมอื่น หรือแจ้งลิงก์เสียให้ทีมตรวจสอบได้'}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
            <a href={hasWatchLink ? watchHref : '/watch-ready'} className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#e50914] px-5 text-sm font-black text-white shadow-glow transition hover:scale-[1.01] hover:brightness-110 md:h-12 md:px-6">
              ▶ {hasWatchLink ? 'เปิดหน้าเล่น' : 'รับชมตอนนี้'}
            </a>
            <DetailReportButton tmdbId={tmdbId} mediaType={mediaType} title={title} className="h-11 rounded-2xl bg-black/35 px-4 text-xs font-black text-white/70 shadow-[0_12px_34px_rgba(0,0,0,0.32)] backdrop-blur-xl transition hover:bg-white/[0.08] md:h-12">
              แจ้งลิงก์เสีย
            </DetailReportButton>
          </div>
        </div>
      </div>
    </section>
  );
}

export function DetailPageView({ detail }: { detail: DetailPayload }) {
  const { item, cast, trailerUrl, recommendations } = detail;
  const effectiveTrailerUrl = item.trailerUrl || trailerUrl;
  const watchHref = `/watch/${item.mediaType}/${item.id}`;
  const hasWatchLink = Boolean(item.watchUrl || item.isWatchReady);
  const primaryHref = hasWatchLink ? watchHref : effectiveTrailerUrl || '/watch-ready';
  const primaryLabel = hasWatchLink ? 'รับชม' : effectiveTrailerUrl ? 'ดูตัวอย่าง' : 'รับชม';
  const availabilityBadge = hasWatchLink ? 'HD' : effectiveTrailerUrl ? 'ตัวอย่าง' : 'ข้อมูล';
  const fallbackImage = item.backdropUrl || item.posterUrl || '';
  const canonicalPath = `/${item.mediaType}/${item.id}`;
  const canonicalUrl = absoluteUrl(canonicalPath);
  const contentTypeLabel = item.mediaType === 'tv' ? 'ซีรีส์' : 'หนัง';
  const overview = item.overview || 'ยังไม่มีคำอธิบายเรื่องนี้ แต่ระบบเตรียมโครงหน้าไว้สำหรับแสดงรายละเอียด ตัวอย่าง นักแสดง และรายการแนะนำที่เกี่ยวข้อง';
  const imageUrls = [item.backdropUrl, item.posterUrl].filter(Boolean).map((url) => absoluteUrl(String(url)));
  const aggregateRating = item.rating
    ? {
        '@type': 'AggregateRating',
        ratingValue: item.rating.toFixed(1),
        ...(item.voteCount ? { ratingCount: item.voteCount } : {}),
        bestRating: 10,
        worstRating: 0,
      }
    : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': item.mediaType === 'tv' ? 'TVSeries' : 'Movie',
    '@id': `${canonicalUrl}#primary`,
    name: item.title,
    alternateName: item.titleEn,
    description: item.overview,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    datePublished: item.releaseDate || item.year,
    image: imageUrls.length ? imageUrls : undefined,
    genre: item.genres,
    inLanguage: item.language,
    potentialAction: hasWatchLink
      ? {
          '@type': 'WatchAction',
          target: absoluteUrl(watchHref),
        }
      : undefined,
    aggregateRating,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: siteName,
        item: absoluteUrl('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: contentTypeLabel,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: item.title,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030303] px-2 py-4 text-white md:px-4 md:py-7">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="fixed inset-0 -z-10 bg-[#030303]" />
      {fallbackImage ? <div className="fixed inset-0 -z-10 bg-cover bg-center opacity-26 blur-[2px] scale-105" style={{ backgroundImage: `url(${fallbackImage})` }} /> : null}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(229,9,20,0.24),transparent_24rem),radial-gradient(circle_at_80%_8%,rgba(255,255,255,0.08),transparent_22rem),linear-gradient(180deg,rgba(0,0,0,0.62),#030303_72%)]" />

      <article data-detail-layout={DETAIL_LAYOUT_VERSION} className="mx-auto w-full max-w-[920px] overflow-hidden rounded-[28px] bg-[#050505]/88 shadow-[0_42px_150px_rgba(0,0,0,0.94)] backdrop-blur-2xl md:rounded-[34px]">
        <section className="relative bg-black/42 shadow-[inset_0_-80px_110px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          {fallbackImage ? <div className="absolute inset-0 bg-cover bg-center opacity-24 blur-[1px]" style={{ backgroundImage: `url(${fallbackImage})` }} /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.42),rgba(5,5,5,0.86)_55%,rgba(5,5,5,0.98)_100%)] md:bg-[linear-gradient(90deg,rgba(5,5,5,0.98)_0%,rgba(5,5,5,0.86)_42%,rgba(5,5,5,0.48)_100%)]" />

          <a href="/" className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/62 text-xl font-black text-white/80 shadow-[0_14px_42px_rgba(0,0,0,0.72)] backdrop-blur-xl transition hover:bg-white/[0.12] md:right-4 md:top-4 md:h-11 md:w-11 md:text-2xl" aria-label="กลับหน้าแรก">
            ×
          </a>

          <div className="relative z-10 grid grid-cols-[88px_1fr] gap-3 p-4 pt-5 md:grid-cols-[126px_1fr] md:gap-5 md:p-5 md:pb-4">
            <div className="overflow-hidden rounded-[16px] bg-black/40 shadow-[0_20px_55px_rgba(0,0,0,0.75)] backdrop-blur-md md:rounded-[20px]">
              {item.posterUrl ? <img src={item.posterUrl} alt={item.title} loading="lazy" decoding="async" className="h-[132px] w-full object-cover md:h-[188px]" /> : null}
            </div>

            <div className="min-w-0 pr-9 md:pr-11">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#e50914] md:text-[10px] md:tracking-[0.24em]">
                {mediaLabel(item.mediaType)}
              </p>
              <h1 className="modal-title mt-1.5 line-clamp-2 text-[21px] font-black leading-[0.98] tracking-[-0.06em] text-white md:text-[34px]">
                {item.title}
              </h1>
              {item.titleEn && item.titleEn !== item.title ? <p className="mt-2 line-clamp-1 text-sm font-bold text-white/42 md:text-base">{item.titleEn}</p> : null}

              <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-black md:text-[11px]">
                <StatusBadge>★ {(item.rating || 0).toFixed(1)}</StatusBadge>
                <StatusBadge>{item.year}</StatusBadge>
                <StatusBadge>{item.language === 'th' ? 'TH' : item.language || 'EN'}</StatusBadge>
                <StatusBadge active>{availabilityBadge}</StatusBadge>
              </div>

              <p className="mt-2 line-clamp-3 max-w-2xl text-[11px] font-medium leading-4 text-white/58 md:text-[13px] md:leading-5">
                {overview}
              </p>
              <a href="#summary" className="mt-1 inline-flex text-[10px] font-black text-red-200/80 hover:text-red-100 md:text-xs">ดูเพิ่มเติม</a>

              <div className="mt-3 flex flex-wrap gap-2">
                <a {...linkProps(primaryHref)} href={primaryHref} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#e50914] px-3 text-[11px] font-black text-white shadow-[0_14px_36px_rgba(0,0,0,0.42)] backdrop-blur-xl transition hover:brightness-110 md:h-9 md:px-4 md:text-xs">
                  <span>▶</span>{primaryLabel}
                </a>
                <a href="#recommend" className="inline-flex h-8 items-center rounded-lg bg-white/[0.1] px-3 text-[11px] font-black text-white/82 shadow-[0_14px_36px_rgba(0,0,0,0.32)] backdrop-blur-xl transition hover:bg-white/[0.16] md:h-9 md:px-4 md:text-xs">
                  + รายการโปรด
                </a>
                <DetailReportButton tmdbId={item.id} mediaType={item.mediaType} title={item.title} className="inline-flex h-8 items-center rounded-lg bg-white/[0.08] px-3 text-[11px] font-black text-white/70 shadow-[0_14px_36px_rgba(0,0,0,0.32)] backdrop-blur-xl transition hover:bg-white/[0.14] md:h-9 md:px-4 md:text-xs">
                  แจ้งลิงก์เสีย
                </DetailReportButton>
              </div>
            </div>
          </div>

          <div className="relative z-10 px-4 pb-4 md:px-5 md:pb-5">
            <TrailerCard title={item.title} trailerUrl={effectiveTrailerUrl} fallbackImage={fallbackImage} />
          </div>
        </section>

        <nav className="sticky top-0 z-20 bg-black/62 px-3 shadow-[0_20px_60px_rgba(0,0,0,0.58)] backdrop-blur-2xl md:px-5" aria-label="รายละเอียดเรื่องนี้">
          <div className="movie-rail flex gap-1 overflow-x-auto py-2.5 md:gap-1.5 md:py-3">
            {detailTabs.map((tab, index) => (
              <a key={tab.label} href={tab.href} className={`min-w-max rounded-md px-3 py-1.5 text-[10px] font-black shadow-[0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl transition md:px-4 md:py-2 md:text-xs ${index === 0 ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/55 hover:bg-white/[0.12] hover:text-white'}`}>
                {tab.label}
              </a>
            ))}
          </div>
        </nav>

        <section className="flex flex-col gap-6 p-3 md:p-4">
          <SectionSurface id="recommend">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#e50914]/75">Recommended</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.04em] md:text-2xl">แนะนำสำหรับคุณ</h2>
              </div>
              <a href="/watch-ready" className="shrink-0 text-xs font-black text-white/45 hover:text-white md:text-sm">ดูทั้งหมด ›</a>
            </div>

            <DetailRecommendationCarousel current={item} items={recommendations} />
          </SectionSurface>

          <SectionSurface id="cast">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#e50914]/75">Cast</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.04em] md:text-2xl">นักแสดงหลัก</h2>
              </div>
              <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-black text-white/38 backdrop-blur-xl">นักแสดง</span>
            </div>

            {cast.length ? (
              <div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-3">
                {cast.slice(0, 12).map((person, index) => (
                  <div key={`${person.id || person.name}-${index}`} className="relative aspect-[2/3] overflow-hidden rounded-[12px] bg-white/[0.055] shadow-[0_16px_54px_rgba(0,0,0,0.55)] backdrop-blur-xl md:rounded-[16px]">
                    {person.profileUrl ? <img src={person.profileUrl} alt={person.name} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_24%,#8a111b,#111_62%)] text-4xl font-black text-white/78 md:text-5xl">{personInitial(person.name)}</div>}
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
          </SectionSurface>

          <SectionSurface id="detail">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#e50914]/75">Details</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.04em] md:text-2xl">รายละเอียด</h2>
              </div>
              <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-black text-white/38 backdrop-blur-xl">{statusLabel(item.status, item.isWatchReady)}</span>
            </div>
            <div className="mt-3 grid gap-2 text-[11px] font-bold text-white/62 sm:grid-cols-2 md:mt-4 md:gap-3 md:text-sm">
              <p>ประเภท: {(item.genres || []).join(', ') || mediaLabel(item.mediaType)}</p>
              <p>ความยาว: {item.runtime ? `${item.runtime} นาที` : 'ยังไม่มีข้อมูล'}</p>
              <p>ปี: {item.year}</p>
              <p>ภาษา: {item.language === 'th' ? 'ไทย' : item.language || 'ไม่ระบุ'}</p>
              <p>สถานะ: {statusLabel(item.status, item.isWatchReady)}</p>
              <p>คะแนน: {(item.rating || 0).toFixed(1)} / 10</p>
            </div>
          </SectionSurface>

          <SectionSurface id="summary" className="bg-yellow-300/[0.055]">
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-yellow-100/62">Overview</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.04em] md:text-2xl">เรื่องย่อ</h2>
            <div className="mt-3 rounded-2xl bg-black/28 p-3 text-xs leading-6 text-yellow-50/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:text-sm md:leading-7">
              {overview}
            </div>
          </SectionSurface>

          <WatchReadyPanel title={item.title} tmdbId={item.id} mediaType={item.mediaType} fallbackImage={fallbackImage} watchHref={watchHref} hasWatchLink={hasWatchLink} />
        </section>
      </article>
    </main>
  );
}
