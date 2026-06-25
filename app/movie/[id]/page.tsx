import type { Metadata } from 'next';
import { DetailPageView } from '@/components/detail-page-view';
import { getDetailPayload } from '@/lib/tmdb';
import { absoluteUrl, canonical, seoConfig } from '@/lib/seo';

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await getDetailPayload('movie', id);
  const title = `ดูหนัง ${detail.item.title}${detail.item.year ? ` (${detail.item.year})` : ''}`;
  const description = detail.item.overview || `ดูรายละเอียดหนัง ${detail.item.title} เรื่องย่อ คะแนน ตัวอย่าง นักแสดง และสถานะพร้อมรับชมบน${seoConfig.siteName}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonical(`/movie/${id}`),
    },
    openGraph: {
      title: `${title} | ${seoConfig.siteName}`,
      description,
      url: absoluteUrl(`/movie/${id}`),
      images: [{ url: detail.item.backdropUrl || detail.item.posterUrl, alt: detail.item.title }],
      siteName: seoConfig.siteName,
      type: 'video.movie',
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

export default async function MovieDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getDetailPayload('movie', id);
  return <DetailPageView detail={detail} />;
}
