import { FavoriteClickBridge } from '@/components/favorite-click-bridge';
import { HomeRealtimeWrapper } from '@/components/home-realtime-wrapper';
import { WatchHistoryClickBridge } from '@/components/watch-history-click-bridge';
import { getCatalogHomePayload } from '@/lib/catalog-home';

export default async function HomePage() {
  const home = await getCatalogHomePayload();
  return (
    <>
      <HomeRealtimeWrapper home={home} />
      <FavoriteClickBridge home={home} />
      <WatchHistoryClickBridge home={home} />
    </>
  );
}
