import type { Metadata } from 'next';
import { DetailPageView } from '@/components/detail-page-view';
import { getDetailPayload } from '@/lib/tmdb';
import { absoluteUrl, canonical, seoConfig } from '@/lib/seo';

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await getDetailPayload('tv', id);
  const title = `ดูซีรีส์ ${detail.item.title}`;
  const description = detail.item.overview || `ดูรายละเอียดซีรีส์ ${detail.item.title} เรื่องย่อ คะแนน ตัวอย่าง นักแสดง และสถานะพร้อมรับชมบน${seoConfig.siteName}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonical(`/tv/${id}`),
    },
    openGraph: {
      title: `${title} | ${seoConfig.siteName}`,
      description,
      url: absoluteUrl(`/tv/${id}`),
      images: [{ url: detail.item.backdropUrl || detail.item.posterUrl, alt: detail.item.title }],
      siteName: seoConfig.siteName,
      type: 'video.tv_show',
      locale: seoConfig.locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${seoConfig.siteName}`,
      description,
      images: [detail.item.backdropUrl || detail.item.posterUrl],
    },
  };
}

export default async function TvDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getDetailPayload('tv', id);
  return <DetailPageView detail={detail} />;
}
