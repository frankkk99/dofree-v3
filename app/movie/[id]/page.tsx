import type { Metadata } from 'next';
import { DetailPageView } from '@/components/detail-page-view';
import { getDetailPayload } from '@/lib/tmdb';

const siteName = 'ดูดีดี';

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await getDetailPayload('movie', id);
  return {
    title: `ดูหนัง ${detail.item.title} (${detail.item.year})`,
    description: detail.item.overview,
    openGraph: {
      title: `${detail.item.title} | ${siteName}`,
      description: detail.item.overview,
      images: [detail.item.backdropUrl],
      siteName,
    },
  };
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getDetailPayload('movie', id);
  return <DetailPageView detail={detail} />;
}
