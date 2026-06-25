import type { MetadataRoute } from 'next';
import { hasSupabaseRestConfig, supabaseRest } from '@/lib/supabase-rest';
import { seoConfig } from '@/lib/seo';

type CatalogSitemapRow = {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  release_date?: string | null;
};

const publicRoutes: Array<{ path: string; frequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = [
  { path: '/', frequency: 'daily', priority: 1 },
  { path: '/watch-ready', frequency: 'daily', priority: 0.9 },
  { path: '/search', frequency: 'weekly', priority: 0.7 },
  { path: '/membership', frequency: 'monthly', priority: 0.5 },
];

async function catalogUrls(now: Date): Promise<MetadataRoute.Sitemap> {
  if (!hasSupabaseRestConfig('service')) return [];

  const rows = await supabaseRest<CatalogSitemapRow[]>(
    'tmdb_catalog?select=tmdb_id,media_type,release_date&is_active=eq.true&order=sort_score.desc&limit=5000',
    { mode: 'service', cache: 'no-store' }
  ).catch(() => []);

  return rows
    .filter((row) => row.tmdb_id && (row.media_type === 'movie' || row.media_type === 'tv'))
    .map((row) => ({
      url: `${seoConfig.domain}/${row.media_type}/${row.tmdb_id}`,
      lastModified: row.release_date ? new Date(row.release_date) : now,
      changeFrequency: 'weekly',
      priority: row.media_type === 'movie' ? 0.76 : 0.74,
    }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  return [
    ...publicRoutes.map((route) => ({
      url: `${seoConfig.domain}${route.path === '/' ? '' : route.path}`,
      lastModified: now,
      changeFrequency: route.frequency,
      priority: route.priority,
    })),
    ...(await catalogUrls(now)),
  ];
}
