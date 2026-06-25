import { AdminLinkVisibilityGuard } from '@/components/admin-link-visibility-guard';
import { FavoriteClickBridge } from '@/components/favorite-click-bridge';
import { HomeCardLinkBridge } from '@/components/home-card-link-bridge';
import { HomeRealtimeWrapper } from '@/components/home-realtime-wrapper';
import { WatchHistoryClickBridge } from '@/components/watch-history-click-bridge';
import { getCatalogHomePayload } from '@/lib/catalog-home';

export default async function HomePage() {
  const home = await getCatalogHomePayload();
  return (
    <>
      <HomeRealtimeWrapper home={home} />
      <HomeCardLinkBridge home={home} />
      <FavoriteClickBridge home={home} />
      <WatchHistoryClickBridge home={home} />
      <AdminLinkVisibilityGuard />
    </>
  );
}
