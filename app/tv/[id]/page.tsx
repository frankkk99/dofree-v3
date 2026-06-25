import type { Metadata } from 'next';
import { DetailPageView } from '@/components/detail-page-view';
import { getDetailPayload } from '@/lib/tmdb';

const siteName = 'ดูดีดี';

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await getDetailPayload('tv', id);
  return {
    title: `ดูซีรีส์ ${detail.item.title}`,
    description: detail.item.overview,
    openGraph: {
      title: `${detail.item.title} | ${siteName}`,
      description: detail.item.overview,
      images: [detail.item.backdropUrl],
      siteName,
    },
  };
}

export default async function TvDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getDetailPayload('tv', id);
  return <DetailPageView detail={detail} />;
}
