import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildOgImages, noindexRobots, safeDescription, siteName } from '@/lib/seo';
import { getDetailPayload, type MediaType } from '@/lib/tmdb';

const allowedMediaTypes = new Set(['movie', 'tv']);

type PageProps = {
  params: Promise<{ mediaType: string; id: string }>;
  searchParams?: Promise<{ season?: string; episode?: string }>;
};

function parseMediaType(value: string): MediaType {
  return allowedMediaTypes.has(value) ? (value as MediaType) : 'movie';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { mediaType, id } = await params;
  const parsedMediaType = parseMediaType(mediaType);
  const detail = await getDetailPayload(parsedMediaType, id);
  const canonical = `/${parsedMediaType}/${id}#watch`;
  const description = safeDescription(detail.item.overview || `หน้ารับชม ${detail.item.title} บน${siteName}`);

  return {
    title: `รับชม ${detail.item.title}`,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `รับชม ${detail.item.title} | ${siteName}`,
      description,
      images: buildOgImages(detail.item.backdropUrl, detail.item.posterUrl),
      siteName,
    },
    robots: noindexRobots(false),
  };
}

export default async function WatchPage({ params, searchParams }: PageProps) {
  const { mediaType, id } = await params;
  const query = await searchParams;
  const parsedMediaType = parseMediaType(mediaType);
  const detailPath = `/${parsedMediaType}/${id}`;
  const paramsForDetail = new URLSearchParams();

  if (parsedMediaType === 'tv' && query?.season && query?.episode) {
    paramsForDetail.set('season', query.season);
    paramsForDetail.set('episode', query.episode);
  }

  const search = paramsForDetail.toString();
  redirect(`${detailPath}${search ? `?${search}` : ''}#watch`);
}
