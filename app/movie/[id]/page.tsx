import type { Metadata } from 'next';
import { DetailPageView } from '@/components/detail-page-view';
import { absoluteUrl, baseOpenGraph, buildOgImages, indexRobots, safeDescription, siteName } from '@/lib/seo';
import { getDetailPayload, getWatchSourceUrl, type MediaType } from '@/lib/tmdb';
import { createWatchSourceToken } from '@/lib/watch-source-token';

type PageProps = {
  params: Promise<{ id: string }>;
};

function protectedWatchUrl(sourceUrl: string | undefined, mediaType: MediaType, id: number) {
  if (!sourceUrl) return undefined;
  try {
    const token = createWatchSourceToken({ url: sourceUrl, mediaType, id }, 60 * 60);
    return `/api/watch/source?token=${encodeURIComponent(token)}`;
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await getDetailPayload('movie', id);
  const year = detail.item.year ? ` (${detail.item.year})` : '';
  const title = `ดูหนัง ${detail.item.title}${year} เรื่องย่อ นักแสดง ตัวอย่าง`;
  const description = safeDescription(
    detail.item.overview,
    `ดูข้อมูลหนัง ${detail.item.title}${year} พร้อมเรื่องย่อ นักแสดง ตัวอย่าง รายการแนะนำ และสถานะพร้อมรับชมบน${siteName}`,
  );
  const canonical = `/movie/${id}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      ...baseOpenGraph(canonical),
      type: 'website',
      title: `${title} | ${siteName}`,
      description,
      url: absoluteUrl(canonical),
      images: buildOgImages(detail.item.backdropUrl, detail.item.posterUrl),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteName}`,
      description,
      images: buildOgImages(detail.item.backdropUrl, detail.item.posterUrl),
    },
    robots: indexRobots(),
  };
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getDetailPayload('movie', id);
  const watchSourceUrl = protectedWatchUrl(await getWatchSourceUrl('movie', detail.item.id), 'movie', detail.item.id);
  return <DetailPageView detail={detail} watchSourceUrl={watchSourceUrl} />;
}
