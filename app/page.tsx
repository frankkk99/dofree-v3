import { AdminLinkVisibilityGuard } from '@/components/admin-link-visibility-guard';
import { FavoriteClickBridge } from '@/components/favorite-click-bridge';
import { HomeCardLinkBridge } from '@/components/home-card-link-bridge';
import { HomeRealtimeWrapper } from '@/components/home-realtime-wrapper';
import { WatchHistoryClickBridge } from '@/components/watch-history-click-bridge';
import { getCatalogHomePayload } from '@/lib/catalog-home';
import { absoluteUrl, seoConfig } from '@/lib/seo';

const homepageJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: seoConfig.siteName,
    alternateName: ['ดูดีดีออนไลน์', seoConfig.englishSiteName, seoConfig.legacyName],
    url: absoluteUrl('/'),
    inLanguage: seoConfig.language,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${absoluteUrl('/search')}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: seoConfig.siteName,
    alternateName: [seoConfig.englishSiteName, seoConfig.legacyName],
    url: absoluteUrl('/'),
    logo: absoluteUrl('/opengraph-image'),
  },
];

export default async function HomePage() {
  const home = await getCatalogHomePayload();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageJsonLd) }} />
      <HomeRealtimeWrapper home={home} />
      <HomeCardLinkBridge home={home} />
      <FavoriteClickBridge home={home} />
      <WatchHistoryClickBridge home={home} />
      <AdminLinkVisibilityGuard />
    </>
  );
}
