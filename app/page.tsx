import { AutoHideHeader } from '@/components/auto-hide-header';
import { CleanHamburgerMenu } from '@/components/clean-hamburger-menu';
import { FavoriteClickBridge } from '@/components/favorite-click-bridge';
import { FloatingGlassSearch } from '@/components/floating-glass-search';
import { FloatingSearchPolish } from '@/components/floating-search-polish';
import { HomeCardLinkBridge } from '@/components/home-card-link-bridge';
import { HomeRealtimeWrapper } from '@/components/home-realtime-wrapper';
import { ModalEpisodeTitleLabels } from '@/components/modal-episode-title-labels';
import { ModalRecommendationDefault } from '@/components/modal-recommendation-default';
import { ReliableHeroCarousel } from '@/components/reliable-hero-carousel';
import { WatchHistoryClickBridge } from '@/components/watch-history-click-bridge';
import { getCatalogHomePayload } from '@/lib/catalog-home';

export const revalidate = 300;

const siteName = '\u0e14\u0e39\u0e14\u0e35\u0e14\u0e35';
const englishSiteName = 'DodeedeeV3';
const siteUrl = 'https://www.xn--l3caa5kbu.online/';
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteName,
  alternateName: ['\u0e14\u0e39\u0e14\u0e35\u0e14\u0e35\u0e2d\u0e2d\u0e19\u0e44\u0e25\u0e19\u0e4c', englishSiteName, 'Dodeedee', 'DooDeeDee'],
  url: siteUrl,
};

export default async function HomePage() {
  const home = await getCatalogHomePayload();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <HomeRealtimeWrapper home={home} />
      <AutoHideHeader />
      <FloatingGlassSearch home={home} />
      <FloatingSearchPolish />
      <ModalEpisodeTitleLabels />
      <ModalRecommendationDefault />
      <HomeCardLinkBridge home={home} />
      <FavoriteClickBridge home={home} />
      <WatchHistoryClickBridge home={home} />
      <CleanHamburgerMenu />
      <ReliableHeroCarousel home={home} />
    </>
  );
}
