import { CleanHamburgerMenu } from '@/components/clean-hamburger-menu';
import { FavoriteClickBridge } from '@/components/favorite-click-bridge';
import { FloatingGlassSearch } from '@/components/floating-glass-search';
import { FloatingSearchPolish } from '@/components/floating-search-polish';
import { HomeCardLinkBridge } from '@/components/home-card-link-bridge';
import { HomeRealtimeWrapper } from '@/components/home-realtime-wrapper';
import { ReliableHeroCarousel } from '@/components/reliable-hero-carousel';
import { ReleaseWindowAutoCarousel } from '@/components/release-window-auto-carousel';
import { SearchBehaviorFix } from '@/components/search-behavior-fix';
import { WatchHistoryClickBridge } from '@/components/watch-history-click-bridge';
import { getCatalogHomePayload } from '@/lib/catalog-home';

const siteName = 'ดูดีดี';
const englishSiteName = 'DodeedeeV3';
const siteUrl = 'https://www.xn--l3caa5kbu.online/';
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteName,
  alternateName: ['ดูดีดีออนไลน์', englishSiteName, 'Dodeedee', 'DooDeeDee'],
  url: siteUrl,
};

export default async function HomePage() {
  const home = await getCatalogHomePayload();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <HomeRealtimeWrapper home={home} />
      <SearchBehaviorFix />
      <FloatingGlassSearch home={home} />
      <FloatingSearchPolish />
      <HomeCardLinkBridge home={home} />
      <FavoriteClickBridge home={home} />
      <WatchHistoryClickBridge home={home} />
      <CleanHamburgerMenu />
      <ReliableHeroCarousel home={home} />
      <ReleaseWindowAutoCarousel />
    </>
  );
}
