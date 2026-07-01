import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DetailPageView } from '@/components/detail-page-view';
import { absoluteUrl, baseOpenGraph, buildOgImages, indexRobots, mediaDetailPath, mediaIdFromSlug, safeDescription, siteName } from '@/lib/seo';
import { getDetailPayload, type DetailPayload } from '@/lib/tmdb';

type PageProps = {
  params: Promise<{ id: string }>;
};

const fallbackBackdrop = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80';
const fallbackPoster = 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=80';

function titleFromSlug(rawId: string, fallback = 'ข้อมูลหนัง') {
  const withoutId = rawId.replace(/^\d+[-_]?/, '').replace(/[-_]+/g, ' ').trim();
  return withoutId ? withoutId.replace(/\b\w/g, (char) => char.toUpperCase()) : fallback;
}

function fallbackDetail(rawId: string): DetailPayload {
  const id = Number(mediaIdFromSlug(rawId)) || 0;
  const title = titleFromSlug(rawId);
  const item = {
    id,
    mediaType: 'movie' as const,
    title,
    titleEn: title,
    overview: `ดูข้อมูลหนัง ${title} พร้อมเรื่องย่อ ตัวอย่าง นักแสดง และสถานะพร้อมรับชมบน${siteName}`,
    posterUrl: fallbackPoster,
    backdropUrl: fallbackBackdrop,
    rating: 0,
    voteCount: 0,
    year: '',
    genres: ['ภาพยนตร์'],
    language: 'th',
    status: 'draft' as const,
    isWatchReady: false,
    badges: ['ข้อมูล'],
  };
  return { item, cast: [], trailerUrl: undefined, recommendations: [], source: 'fallback' };
}

async function loadMovieDetail(rawId: string): Promise<DetailPayload> {
  const id = mediaIdFromSlug(rawId);
  if (!id) return fallbackDetail(rawId);

  try {
    return await getDetailPayload('movie', id);
  } catch (error) {
    console.warn('movie detail fallback used', { rawId, error });
    return fallbackDetail(rawId);
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: rawId } = await params;
  const detail = await loadMovieDetail(rawId);
  const year = detail.item.year ? ` (${detail.item.year})` : '';
  const title = `ดูหนัง ${detail.item.title}${year} เรื่องย่อ นักแสดง ตัวอย่าง`;
  const description = safeDescription(
    detail.item.overview,
    `ดูข้อมูลหนัง ${detail.item.title}${year} พร้อมเรื่องย่อ นักแสดง ตัวอย่าง รายการแนะนำ และสถานะพร้อมรับชมบน${siteName}`,
  );
  const canonical = mediaDetailPath('movie', detail.item.id || mediaIdFromSlug(rawId) || rawId, detail.item.title);

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
  const { id: rawId } = await params;
  const detail = await loadMovieDetail(rawId);
  const canonical = mediaDetailPath('movie', detail.item.id || mediaIdFromSlug(rawId) || rawId, detail.item.title);
  if (`/movie/${rawId}` !== canonical) redirect(canonical);
  return <DetailPageView detail={detail} />;
}
