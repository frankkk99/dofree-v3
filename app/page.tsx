import { ActorProfileBridge } from '@/components/actor-profile-bridge';
import { AutoHideHeader } from '@/components/auto-hide-header';
import { FloatingGlassSearch } from '@/components/floating-glass-search';
import { HomeRealtimeWrapper } from '@/components/home-realtime-wrapper';
import { NotificationBellPortal } from '@/components/notification-bell-portal';
import { applyAdminHomeConfig } from '@/lib/admin-home-config';
import { getCatalogHomePayload } from '@/lib/catalog-home';
import { absoluteUrl, englishSiteName, siteDescription, siteName, siteUrl } from '@/lib/seo';
import { decorateHomeWithFreshTmdbReleases } from '@/lib/tmdb-release-window';

export const revalidate = 300;

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteName,
  alternateName: ['ดูดีดีออนไลน์', englishSiteName, 'DooDeeDee'],
  url: siteUrl,
  description: siteDescription,
  publisher: {
    '@type': 'Organization',
    name: siteName,
    alternateName: englishSiteName,
    url: siteUrl,
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: `${absoluteUrl('/search')}?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
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
    </>
  );
}
