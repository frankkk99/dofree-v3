import { HomeRealtimeWrapper } from '@/components/home-realtime-wrapper';
import { getCatalogHomePayload } from '@/lib/catalog-home';

export default async function HomePage() {
  const home = await getCatalogHomePayload();
  return <HomeRealtimeWrapper home={home} />;
}
