import { NextResponse } from 'next/server';
import { seoCategories } from '@/lib/seo-categories';
import { absoluteUrl, englishSiteName, siteDescription, siteName, siteUrl } from '@/lib/seo';

export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json({
    name: siteName,
    alternateName: englishSiteName,
    url: siteUrl,
    description: siteDescription,
    importantUrls: [
      absoluteUrl('/'),
      absoluteUrl('/watch-ready'),
      absoluteUrl('/search'),
    ],
    indexablePatterns: [
      absoluteUrl('/movie/[id]'),
      absoluteUrl('/tv/[id]'),
    ],
    noindexPatterns: [
      absoluteUrl('/admin/'),
      absoluteUrl('/auth'),
      absoluteUrl('/watch/'),
      absoluteUrl('/membership'),
      absoluteUrl('/favorites'),
      absoluteUrl('/history'),
      absoluteUrl('/notifications'),
      absoluteUrl('/api/'),
    ],
    plannedCategories: seoCategories.map((category) => ({
      slug: category.slug,
      title: category.title,
      description: category.description,
    })),
  });
}
