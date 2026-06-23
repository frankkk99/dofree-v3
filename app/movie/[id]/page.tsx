import type { Metadata } from 'next';
import { DetailPageView } from '@/components/detail-page-view';
import { getDetailPayload } from '@/lib/tmdb';

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await getDetailPayload('movie', id);
  return {
    title: `ดูรายละเอียด ${detail.item.title} (${detail.item.year})`,
    description: detail.item.overview,
    openGraph: {
      title: `${detail.item.title} | DOFree v3`,
      description: detail.item.overview,
      images: [detail.item.backdropUrl],
    },
  };
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getDetailPayload('movie', id);
  return <DetailPageView detail={detail} />;
}
