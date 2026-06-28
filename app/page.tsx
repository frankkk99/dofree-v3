import { ActorProfileBridge } from '@/components/actor-profile-bridge';
import { AutoHideHeader } from '@/components/auto-hide-header';
import { FavoriteClickBridge } from '@/components/favorite-click-bridge';
import { FloatingGlassSearch } from '@/components/floating-glass-search';
import { HomeCardLinkBridge } from '@/components/home-card-link-bridge';
import { HomeRealtimeWrapper } from '@/components/home-realtime-wrapper';
import { ModalEpisodeTitleLabels } from '@/components/modal-episode-title-labels';
import { ModalRecommendationDefault } from '@/components/modal-recommendation-default';
import { NotificationBellPortal } from '@/components/notification-bell-portal';
import { WatchHistoryClickBridge } from '@/components/watch-history-click-bridge';
import { applyAdminHomeConfig } from '@/lib/admin-home-config';
import { getCatalogHomePayload } from '@/lib/catalog-home';
import { decorateHomeWithFreshTmdbReleases } from '@/lib/tmdb-release-window';

export const revalidate = 300;

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
  const home = await decorateHomeWithFreshTmdbReleases(await applyAdminHomeConfig(await getCatalogHomePayload()));
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <HomeRealtimeWrapper home={home} />
      <AutoHideHeader />
      <FloatingGlassSearch home={home} />
      <NotificationBellPortal />
      <ActorProfileBridge />
      <ModalEpisodeTitleLabels />
      <ModalRecommendationDefault />
      <HomeCardLinkBridge home={home} />
      <FavoriteClickBridge home={home} />
      <WatchHistoryClickBridge home={home} />
    </>
  );
}
