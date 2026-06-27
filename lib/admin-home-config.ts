import { supabaseRest } from './supabase-rest';
import type { HomePayload, MovieSection } from './tmdb';

type AdminCategoryRow = {
  slug: string;
  title_th: string;
  subtitle_th?: string | null;
  enabled: boolean;
  sort_order: number;
};

const fallbackOrder = ['watch-ready', 'top-rated', 'popular', 'now-playing', 'series', 'thai', 'action', 'adventure', 'animation', 'drama', 'thriller', 'horror', 'comedy', 'sci-fi', 'romance', 'fantasy', 'crime', 'mystery', 'korea', 'japan', 'china', 'documentary'];

function fallbackSort(slug: string) {
  const index = fallbackOrder.indexOf(slug);
  return index >= 0 ? index * 10 : 9999;
}

export async function getAdminCategoryConfig() {
  try {
    const rows = await supabaseRest<AdminCategoryRow[]>(
      'admin_categories?select=slug,title_th,subtitle_th,enabled,sort_order&order=sort_order.asc',
      { mode: 'service', cache: 'no-store' }
    );
    return rows || [];
  } catch {
    return [];
  }
}

export async function applyAdminHomeConfig(home: HomePayload): Promise<HomePayload> {
  const configs = await getAdminCategoryConfig();
  if (!configs.length) return home;

  const map = new Map(configs.map((row) => [row.slug, row]));
  const configuredSections = home.sections
    .map((section): MovieSection | null => {
      const config = map.get(section.slug);
      if (config && config.enabled === false) return null;
      return {
        ...section,
        title: config?.title_th || section.title,
        description: config?.subtitle_th || section.description,
        eyebrow: section.eyebrow,
      };
    })
    .filter((section): section is MovieSection => Boolean(section))
    .sort((a, b) => {
      const left = map.get(a.slug)?.sort_order ?? fallbackSort(a.slug);
      const right = map.get(b.slug)?.sort_order ?? fallbackSort(b.slug);
      return left - right;
    });

  return { ...home, sections: configuredSections };
}
