import type { Metadata } from 'next';
import { SearchPageClient } from '@/components/search-page-client';
import { baseOpenGraph, indexRobots, noindexRobots, safeDescription, siteName } from '@/lib/seo';

type SearchProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function single(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] || '' : '';
}

export async function generateMetadata({ searchParams }: SearchProps): Promise<Metadata> {
  const params = await searchParams;
  const q = single(params, 'q').trim();
  const title = q ? `ผลการค้นหา "${q}"` : 'ค้นหาหนังและซีรีส์';
  const description = safeDescription(
    q ? `ผลการค้นหา "${q}" บน${siteName} พร้อมรายการภาพยนตร์ ซีรีส์ และคอนเทนต์ที่เกี่ยวข้อง` : `ค้นหาภาพยนตร์ ซีรีส์ อนิเมะ นักแสดง และรายการพร้อมรับชมบน${siteName}`,
  );

  return {
    title,
    description,
    alternates: {
      canonical: '/search',
    },
    openGraph: {
      ...baseOpenGraph('/search'),
      title: `${title} | ${siteName}`,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteName}`,
      description,
    },
    robots: q ? noindexRobots(true) : indexRobots(),
  };
}

export default async function SearchPage({ searchParams }: SearchProps) {
  const params = await searchParams;
  return (
    <SearchPageClient
      initialQuery={single(params, 'q')}
      initialFilters={{
        category: single(params, 'category'),
        type: single(params, 'type'),
        country: single(params, 'country'),
        language: single(params, 'language'),
        quality: single(params, 'quality'),
        year: single(params, 'year'),
        rating: single(params, 'rating'),
        sort: single(params, 'sort') || 'rating-desc',
      }}
    />
  );
}
