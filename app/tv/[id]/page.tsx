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

function titleFromSlug(rawId: string, fallback = 'ข้อมูลซีรีส์') {
  const withoutId = rawId.replace(/^\d+[-_]?/, '').replace(/[-_]+/g, ' ').trim();
  return withoutId ? withoutId.replace(/\b\w/g, (char) => char.toUpperCase()) : fallback;
}

function fallbackDetail(rawId: string): DetailPayload {
  const id = Number(mediaIdFromSlug(rawId)) || 0;
  const title = titleFromSlug(rawId);
  const item = {
    id,
    mediaType: 'tv' as const,
    title,
    titleEn: title,
    overview: `ดูข้อมูลซีรีส์ ${title} พร้อมเรื่องย่อ ตัวอย่าง นักแสดง และสถานะพร้อมรับชมบน${siteName}`,
    posterUrl: fallbackPoster,
    backdropUrl: fallbackBackdrop,
    rating: 0,
    voteCount: 0,
    year: '',
    genres: ['ซีรีส์'],
    language: 'th',
    status: 'draft' as const,
    isWatchReady: false,
    badges: ['ข้อมูล'],
  };
  return { item, cast: [], trailerUrl: undefined, recommendations: [], source: 'fallback' };
}

async function loadTvDetail(rawId: string): Promise<DetailPayload> {
  const id = mediaIdFromSlug(rawId);
  if (!id) return fallbackDetail(rawId);

  try {
    return await getDetailPayload('tv', id);
  } catch (error) {
    console.warn('tv detail fallback used', { rawId, error });
    return fallbackDetail(rawId);
  }
}

function canonicalPath(rawId: string, detail: DetailPayload) {
  return mediaDetailPath('tv', detail.item.id || mediaIdFromSlug(rawId) || rawId, detail.item.title);
}

function shouldRedirectToCanonical(rawId: string, canonical: string) {
  const id = mediaIdFromSlug(rawId);
  if (!id) return false;
  const canonicalSlug = canonical.replace(/^\/tv\//, '');
  return rawId !== canonicalSlug;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: rawId } = await params;
  const detail = await loadTvDetail(rawId);
  const year = detail.item.year ? ` (${detail.item.year})` : '';
  const title = `ดูซีรีส์ ${detail.item.title}${year} เรื่องย่อ นักแสดง ตัวอย่าง`;
  const description = safeDescription(
    detail.item.overview,
    `ดูข้อมูลซีรีส์ ${detail.item.title}${year} พร้อมเรื่องย่อ นักแสดง ตัวอย่าง รายการแนะนำ และสถานะพร้อมรับชมบน${siteName}`,
  );
  const canonical = canonicalPath(rawId, detail);

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
  const detail = await loadTvDetail(rawId);
  const canonical = canonicalPath(rawId, detail);
  if (shouldRedirectToCanonical(rawId, canonical)) redirect(canonical);
  return <DetailPageView detail={detail} />;
}
