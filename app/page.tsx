import { AutoHideHeader } from '@/components/auto-hide-header';
import { CleanHamburgerMenu } from '@/components/clean-hamburger-menu';
import { FavoriteClickBridge } from '@/components/favorite-click-bridge';
import { FloatingGlassSearch } from '@/components/floating-glass-search';
import { FloatingSearchPolish } from '@/components/floating-search-polish';
import { HomeCardLinkBridge } from '@/components/home-card-link-bridge';
import { HomeRailLazyLoader } from '@/components/home-rail-lazy-loader';
import { HomeRealtimeWrapper } from '@/components/home-realtime-wrapper';
import { ModalEpisodeTitleLabels } from '@/components/modal-episode-title-labels';
import { ModalRecommendationDefault } from '@/components/modal-recommendation-default';
import { ReliableHeroCarousel } from '@/components/reliable-hero-carousel';
import { WatchHistoryClickBridge } from '@/components/watch-history-click-bridge';
import { getCatalogHomePayload } from '@/lib/catalog-home';
import type { HomePayload } from '@/lib/tmdb';

export const revalidate = 300;

const HOME_SECTION_LIMIT = 9;
const HERO_ITEM_LIMIT = 12;
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

function trimHomePayload(home: HomePayload): HomePayload {
  return {
    ...home,
    heroItems: (home.heroItems || []).slice(0, HERO_ITEM_LIMIT),
    sections: home.sections.map((section) => ({
      ...section,
      items: section.items.slice(0, HOME_SECTION_LIMIT),
    })),
  };
}

export default async function HomePage() {
  const home = trimHomePayload(await getCatalogHomePayload());
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <HomeRealtimeWrapper home={home} />
      <HomeRailLazyLoader home={home} />
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
