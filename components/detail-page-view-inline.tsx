import type { ReactNode } from 'react';
import { AdSlot } from '@/components/ad-slot';
import { ActorProfileBridge } from '@/components/actor-profile-bridge';
import { DetailInlineWatchSection } from '@/components/detail-inline-watch-section';
import { DetailPosterImage } from '@/components/detail-poster-image';
import { DetailRecommendationCarousel } from '@/components/detail-recommendation-carousel';
import { FavoriteButton } from '@/components/favorite-button';
import { SmartTrailerPreview } from '@/components/smart-trailer-preview';
import { absoluteUrl, mediaDetailPath, siteName } from '@/lib/seo';
import type { DetailPayload, MediaType, MovieItem } from '@/lib/tmdb';

const detailTabs = [
  { label: 'ตัวอย่าง', href: '#trailer' },
  { label: 'แนะนำ', href: '#recommend' },
  { label: 'นักแสดง', href: '#cast' },
  { label: 'รายละเอียด', href: '#detail' },
  { label: 'เรื่องย่อ', href: '#summary' },
] as const;

function mediaLabel(mediaType: MediaType) {
  return mediaType === 'tv' ? 'ซีรีส์' : 'ภาพยนตร์';
}

function statusLabel(status?: string, isWatchReady?: boolean) {
  if (isWatchReady || status === 'published') return 'พร้อมรับชม';
  if (status === 'review') return 'กำลังตรวจสอบ';
  if (status === 'draft') return 'ตัวอย่างข้อมูล';
  if (status === 'broken') return 'ลิงก์มีปัญหา';
  if (status === 'hidden') return 'ซ่อนจากหน้าเว็บ';
  return 'ข้อมูล';
}

function trailerMode(item: MovieItem) {
  const text = `${item.title} ${item.titleEn || ''} ${(item.badges || []).join(' ')}`.toLowerCase();
  if (text.includes('ซับไทย') || text.includes('thai sub')) return 'thai_sub' as const;
  if (text.includes('พากย์ไทย') || item.language === 'th') return 'thai_dub' as const;
  return 'thai_first' as const;
}

function personInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || 'A';
}

function StatusBadge({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[9px] font-black backdrop-blur-md md:text-[11px] ${active ? 'bg-[#e50914]/25 text-red-100' : 'bg-white/[0.105] text-white/78'}`}>
      {children}
    </span>
  );
}

function SectionSurface({ id, children, className = '' }: { id?: string; children: ReactNode; className?: string }) {
  return <section id={id} className={`rounded-[22px] bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-5 ${className}`}>{children}</section>;
}

export function DetailPageViewInline({ detail }: { detail: DetailPayload }) {
  const { item, cast, trailerUrl, recommendations } = detail;
  const effectiveTrailerUrl = item.trailerUrl || trailerUrl;
  const fallbackImage = item.backdropUrl || item.posterUrl || '';
  const overview = item.overview || 'ยังไม่มีคำอธิบายเรื่องนี้ แต่ระบบเตรียมโครงหน้าไว้สำหรับแสดงรายละเอียด ตัวอย่าง นักแสดง และรายการแนะนำที่เกี่ยวข้อง';
  const hasWatchLink = Boolean(item.watchUrl || item.isWatchReady);
  const canonicalPath = mediaDetailPath(item.mediaType, item.id, item.title);
  const canonicalUrl = absoluteUrl(canonicalPath);
  const imageUrls = [item.backdropUrl, item.posterUrl].filter(Boolean).map((url) => absoluteUrl(String(url)));
  const contentTypeLabel = item.mediaType === 'tv' ? 'ซีรีส์' : 'หนัง';

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
    potentialAction: hasWatchLink ? { '@type': 'WatchAction', target: `${canonicalUrl}#watch` } : undefined,
    aggregateRating: item.rating ? { '@type': 'AggregateRating', ratingValue: item.rating.toFixed(1), ...(item.voteCount ? { ratingCount: item.voteCount } : {}), bestRating: 10, worstRating: 0 } : undefined,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: siteName, item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: contentTypeLabel },
      { '@type': 'ListItem', position: 3, name: item.title, item: canonicalUrl },
    ],
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030303] px-2 py-4 pb-[calc(11rem+env(safe-area-inset-bottom))] text-white md:px-4 md:py-7">
      <ActorProfileBridge />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="fixed inset-0 -z-10 bg-[#030303]" />
      {fallbackImage ? <div className="fixed inset-0 -z-10 scale-105 bg-cover bg-center opacity-28 blur-[2px]" style={{ backgroundImage: `url(${fallbackImage})` }} /> : null}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(229,9,20,0.24),transparent_24rem),linear-gradient(180deg,rgba(0,0,0,0.62),#030303_72%)]" />

      <article data-detail-layout="modal-visual-page-v8-media-mobile-polish" className="mx-auto w-full max-w-[920px] overflow-hidden rounded-[28px] bg-[#050505]/88 shadow-[0_42px_150px_rgba(0,0,0,0.94)] backdrop-blur-2xl md:rounded-[34px]">
        <section className="relative overflow-hidden bg-black/42 pb-4 shadow-[inset_0_-80px_110px_rgba(0,0,0,0.55)] backdrop-blur-xl md:pb-5">
          {fallbackImage ? <div className="absolute inset-0 bg-cover bg-center opacity-24 blur-[1px]" style={{ backgroundImage: `url(${fallbackImage})` }} /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.42),rgba(5,5,5,0.86)_55%,rgba(5,5,5,0.98)_100%)] md:bg-[linear-gradient(90deg,rgba(5,5,5,0.98)_0%,rgba(5,5,5,0.86)_42%,rgba(5,5,5,0.48)_100%)]" />
          <a href="/" className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/62 text-xl font-black text-white/80 backdrop-blur-xl transition hover:bg-white/[0.12] md:right-4 md:top-4 md:h-11 md:w-11 md:text-2xl" aria-label="กลับหน้าแรก">×</a>

          <div className="relative z-10 grid grid-cols-[124px_1fr] gap-3 p-4 pt-5 md:grid-cols-[174px_1fr] md:gap-5 md:p-5 md:pb-4">
            <div className="h-[186px] overflow-hidden rounded-[18px] bg-black/40 shadow-[0_20px_55px_rgba(0,0,0,0.75)] backdrop-blur-md md:h-[260px] md:rounded-[22px]">
              <DetailPosterImage title={item.title} posterUrl={item.posterUrl} backdropUrl={item.backdropUrl} />
            </div>
            <div className="min-w-0 pr-9 md:pr-11">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#e50914] md:text-[10px] md:tracking-[0.24em]">{mediaLabel(item.mediaType)}</p>
              <h1 className="modal-title mt-1.5 line-clamp-3 text-[18px] font-black leading-[0.98] tracking-[-0.06em] text-white md:text-[34px]">{item.title}</h1>
              {item.titleEn && item.titleEn !== item.title ? <p className="mt-2 line-clamp-1 text-xs font-bold text-white/42 md:text-base">{item.titleEn}</p> : null}
              <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-black md:text-[11px]">
                <StatusBadge>★ {(item.rating || 0).toFixed(1)}</StatusBadge>
                <StatusBadge>{item.year}</StatusBadge>
                <StatusBadge>{item.language === 'th' ? 'TH' : item.language || 'EN'}</StatusBadge>
                <StatusBadge active>{hasWatchLink ? 'HD' : effectiveTrailerUrl ? 'ตัวอย่าง' : 'ข้อมูล'}</StatusBadge>
              </div>
              <p className="mt-2 line-clamp-4 max-w-2xl text-[11px] font-medium leading-4 text-white/58 md:text-[13px] md:leading-5">{overview}</p>
              <a href="#summary" className="mt-1 inline-flex text-[10px] font-black text-red-200/80 hover:text-red-100 md:text-xs">ดูเพิ่มเติม</a>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href="#watch" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#e50914] px-3 text-[11px] font-black text-white shadow-[0_14px_36px_rgba(0,0,0,0.42)] backdrop-blur-xl transition hover:brightness-110 md:h-9 md:px-4 md:text-xs"><span>▶</span>รับชม</a>
                <FavoriteButton mediaType={item.mediaType} mediaId={item.id} title={item.title} poster={item.posterUrl} backdrop={item.backdropUrl} />
              </div>
            </div>
          </div>

          <div className="relative z-10 grid gap-4">
            <SmartTrailerPreview title={item.title} titleEn={item.titleEn} year={item.year} tmdbId={item.id} mediaType={item.mediaType} mode={trailerMode(item)} trailerUrl={effectiveTrailerUrl} fallbackImage={fallbackImage} />
          </div>
        </section>

        <nav className="sticky top-0 z-20 bg-black/62 px-3 shadow-[0_20px_60px_rgba(0,0,0,0.58)] backdrop-blur-2xl md:px-5" aria-label="รายละเอียดเรื่องนี้">
          <div className="movie-rail flex gap-1 overflow-x-auto py-2.5 md:gap-1.5 md:py-3">
            {detailTabs.map((tab, index) => <a key={tab.label} href={tab.href} className={`min-w-max rounded-md px-3 py-1.5 text-[10px] font-black backdrop-blur-xl transition md:px-4 md:py-2 md:text-xs ${index === 0 ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/55 hover:bg-white/[0.12] hover:text-white'}`}>{tab.label}</a>)}
          </div>
        </nav>

        <section className="flex flex-col gap-6 p-3 md:p-4">
          <div>
            <AdSlot code="AD-PC-D01" className="mx-auto max-w-4xl" />
            <AdSlot code="AD-MB-D01" className="mx-auto max-w-sm" />
          </div>

          <SectionSurface id="recommend">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div><p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#e50914]/75">Recommended</p><h2 className="mt-1 text-xl font-black tracking-[-0.04em] md:text-2xl">แนะนำสำหรับคุณ</h2></div>
              <a href="/watch-ready" className="shrink-0 text-xs font-black text-white/45 hover:text-white md:text-sm">ดูทั้งหมด ›</a>
            </div>
            <DetailRecommendationCarousel current={item} items={recommendations} />
          </SectionSurface>

          <div>
            <AdSlot code="AD-PC-D05" className="mx-auto max-w-4xl" />
            <AdSlot code="AD-MB-D02" className="mx-auto max-w-sm" />
          </div>

          <SectionSurface id="cast">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#e50914]/75">Cast</p><h2 className="mt-1 text-xl font-black tracking-[-0.04em] md:text-2xl">นักแสดงหลัก</h2></div><span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-black text-white/38 backdrop-blur-xl">นักแสดง</span></div>
            {cast.length ? <div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-3">{cast.slice(0, 8).map((person, index) => <button key={`${person.id || person.name}-${index}`} type="button" data-actor-card="true" data-actor-id={person.id} data-actor-name={person.name} className="group relative aspect-[2/3] overflow-hidden rounded-[12px] bg-white/[0.055] text-left shadow-[0_16px_54px_rgba(0,0,0,0.55)] backdrop-blur-xl transition hover:scale-[1.015] md:rounded-[16px]">{person.profileUrl ? <img src={person.profileUrl} alt={person.name} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_24%,#8a111b,#111_62%)] text-4xl font-black text-white/78 md:text-5xl">{personInitial(person.name)}</div>}<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.06)_44%,rgba(0,0,0,0.92)_100%)]" /><div className="absolute inset-x-0 bottom-0 p-2 md:p-3"><h4 className="line-clamp-2 text-[10px] font-black leading-tight text-white drop-shadow md:text-sm">{person.name}</h4><p className="mt-1 line-clamp-2 text-[8px] font-bold leading-3 text-white/52 md:text-[10px] md:leading-4">{person.character || 'นักแสดง'}</p></div></button>)}</div> : <div className="mt-4 rounded-2xl bg-black/28 p-4 text-center text-xs font-bold text-white/45 backdrop-blur-xl md:text-sm">ยังไม่มีข้อมูลนักแสดงสำหรับเรื่องนี้</div>}
          </SectionSurface>

          <SectionSurface id="detail">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#e50914]/75">Details</p><h2 className="mt-1 text-xl font-black tracking-[-0.04em] md:text-2xl">รายละเอียด</h2></div><span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-black text-white/38 backdrop-blur-xl">{statusLabel(item.status, hasWatchLink)}</span></div>
            <div className="mt-3 grid gap-2 text-[11px] font-bold text-white/62 sm:grid-cols-2 md:mt-4 md:gap-3 md:text-sm"><p>ประเภท: {(item.genres || []).join(', ') || mediaLabel(item.mediaType)}</p><p>ความยาว: {item.runtime ? `${item.runtime} นาที` : 'ยังไม่มีข้อมูล'}</p><p>ปี: {item.year}</p><p>ภาษา: {item.language === 'th' ? 'ไทย' : item.language || 'ไม่ระบุ'}</p><p>สถานะ: {statusLabel(item.status, hasWatchLink)}</p><p>คะแนน: {(item.rating || 0).toFixed(1)} / 10</p></div>
          </SectionSurface>

          <SectionSurface id="summary" className="bg-yellow-300/[0.055]"><p className="text-[10px] font-black uppercase tracking-[0.26em] text-yellow-100/62">Overview</p><h2 className="mt-1 text-xl font-black tracking-[-0.04em] md:text-2xl">เรื่องย่อ</h2><div className="mt-3 rounded-2xl bg-black/28 p-3 text-xs leading-6 text-yellow-50/75 md:text-sm md:leading-7">{overview}</div></SectionSurface>
          <div>
            <AdSlot code="AD-PC-D03" className="mx-auto max-w-3xl" />
            <AdSlot code="AD-MB-D03" className="mx-auto max-w-sm" />
          </div>
        </section>

        <div className="pb-[calc(11rem+env(safe-area-inset-bottom))] md:pb-6">
          <DetailInlineWatchSection tmdbId={item.id} mediaType={item.mediaType} title={item.title} fallbackImage={fallbackImage} />
        </div>
      </article>
    </main>
  );
}
