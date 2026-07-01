import type { MetadataRoute } from 'next';
import { absoluteUrl, siteUrl } from '@/lib/seo';
import { hasSupabaseRestConfig, supabaseRest } from '@/lib/supabase-rest';

const sitemapBatchSize = 1000;
const sitemapMaxCatalogItems = 10000;

type CatalogSitemapRow = {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  updated_at?: string | null;
  release_date?: string | null;
};

function itemUrl(row: Pick<CatalogSitemapRow, 'tmdb_id' | 'media_type'>) {
  return absoluteUrl(`/${row.media_type}/${row.tmdb_id}`);
}

function lastModified(value: string | null | undefined, fallback: Date) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

async function loadCatalogRows(mediaType: 'movie' | 'tv', maxRows: number) {
  const rows: CatalogSitemapRow[] = [];

  for (let offset = 0; offset < maxRows; offset += sitemapBatchSize) {
    const limit = Math.min(sitemapBatchSize, maxRows - offset);
    const page = await supabaseRest<CatalogSitemapRow[]>(
      `tmdb_catalog?select=tmdb_id,media_type,updated_at,release_date&is_active=eq.true&media_type=eq.${mediaType}&order=updated_at.desc.nullslast&limit=${limit}&offset=${offset}`,
      { mode: 'service', cache: 'no-store' },
    );

    rows.push(...(page || []));
    if (!page?.length || page.length < limit) break;
  }

  return rows;
}

async function catalogEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  if (!hasSupabaseRestConfig('service')) return [];

  try {
    const movieLimit = Math.floor(sitemapMaxCatalogItems / 2);
    const [movieRows, tvRows] = await Promise.all([
      loadCatalogRows('movie', movieLimit),
      loadCatalogRows('tv', sitemapMaxCatalogItems - movieLimit),
    ]);

    const deduped = new Map<string, MetadataRoute.Sitemap[number]>();
    for (const row of [...movieRows, ...tvRows]) {
      const url = itemUrl(row);
      deduped.set(url, {
        url,
        lastModified: lastModified(row.updated_at || row.release_date, now),
        changeFrequency: 'weekly',
        priority: row.media_type === 'movie' ? 0.72 : 0.68,
      });
    }

    return [...deduped.values()];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: absoluteUrl('/watch-ready'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/search'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: absoluteUrl('/how-to-use'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.72,
    },
  ];

  return [...staticEntries, ...(await catalogEntries(now))];
}
