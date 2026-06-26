import type { MetadataRoute } from 'next';
import { hasSupabaseRestConfig, supabaseRest } from '@/lib/supabase-rest';

const siteUrl = 'https://www.xn--l3caa5kbu.online';

type CatalogSitemapRow = {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  updated_at?: string | null;
  release_date?: string | null;
};

type LinkSitemapRow = {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  updated_at?: string | null;
};

function itemUrl(row: Pick<CatalogSitemapRow, 'tmdb_id' | 'media_type'>) {
  return `${siteUrl}/${row.media_type}/${row.tmdb_id}`;
}

function watchUrl(row: Pick<LinkSitemapRow, 'tmdb_id' | 'media_type'>) {
  return `${siteUrl}/watch/${row.media_type}/${row.tmdb_id}`;
}

function lastModified(value?: string | null) {
  return value ? new Date(value) : new Date();
}

async function catalogEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  if (!hasSupabaseRestConfig('service')) return [];

  try {
    const [catalogRows, linkRows] = await Promise.all([
      supabaseRest<CatalogSitemapRow[]>(
        'tmdb_catalog?select=tmdb_id,media_type,updated_at,release_date&is_active=eq.true&order=updated_at.desc.nullslast&limit=450',
        { mode: 'service', cache: 'no-store' },
      ),
      supabaseRest<LinkSitemapRow[]>(
        'admin_movie_links?select=tmdb_id,media_type,updated_at&is_active=eq.true&watch_url=not.is.null&order=updated_at.desc.nullslast&limit=450',
        { mode: 'service', cache: 'no-store' },
      ).catch((): LinkSitemapRow[] => []),
    ]);

    const detailEntries = (catalogRows || []).map((row) => ({
      url: itemUrl(row),
      lastModified: lastModified(row.updated_at || row.release_date),
      changeFrequency: 'weekly' as const,
      priority: row.release_date && row.release_date > now.toISOString().slice(0, 10) ? 0.72 : 0.68,
    }));

    const watchEntries = (linkRows || []).map((row) => ({
      url: watchUrl(row),
      lastModified: lastModified(row.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.74,
    }));

    const deduped = new Map<string, MetadataRoute.Sitemap[number]>();
    for (const entry of [...detailEntries, ...watchEntries]) deduped.set(entry.url, entry);
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
      url: `${siteUrl}/watch-ready`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/search`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.72,
    },
  ];

  return [...staticEntries, ...(await catalogEntries(now))];
}
