import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DetailPageView } from '@/components/detail-page-view';
import { absoluteUrl, baseOpenGraph, buildOgImages, indexRobots, mediaDetailPath, mediaIdFromSlug, safeDescription, safePathSegment, siteName } from '@/lib/seo';
import { getDetailPayload } from '@/lib/tmdb';

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = mediaIdFromSlug(rawId);
  const detail = await getDetailPayload('tv', id);
  const year = detail.item.year ? ` (${detail.item.year})` : '';
  const title = `ดูซีรีส์ ${detail.item.title}${year} เรื่องย่อ นักแสดง ตัวอย่าง`;
  const description = safeDescription(
    detail.item.overview,
    `ดูข้อมูลซีรีส์ ${detail.item.title}${year} พร้อมเรื่องย่อ นักแสดง ตัวอย่าง รายการแนะนำ และสถานะพร้อมรับชมบน${siteName}`,
  );
  const canonical = mediaDetailPath('tv', detail.item.id, detail.item.title);

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

export default async function TvDetailPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = mediaIdFromSlug(rawId);
  const detail = await getDetailPayload('tv', id);
  const canonical = mediaDetailPath('tv', detail.item.id, detail.item.title);
  if (`/tv/${safePathSegment(rawId)}` !== canonical) redirect(canonical);
  return <DetailPageView detail={detail} />;
}
