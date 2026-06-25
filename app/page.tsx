import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { AdminLinkVisibilityGuard } from '@/components/admin-link-visibility-guard';
import { FavoriteClickBridge } from '@/components/favorite-click-bridge';
import { HomeCardLinkBridge } from '@/components/home-card-link-bridge';
import { HomeRealtimeWrapper } from '@/components/home-realtime-wrapper';
import { WatchHistoryClickBridge } from '@/components/watch-history-click-bridge';
import { getCatalogHomePayload } from '@/lib/catalog-home';


export const metadata: Metadata = pageMetadata({
  title: 'ผลงาน Next.js Movie Portfolio',
  description: 'DOFree v3 portfolio website โทนมืดพรีเมียม แสดงระบบ catalog, search, watch-ready, admin-ready และ UX สำหรับเว็บคอนเทนต์วิดีโอ',
  path: '/',
});

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
