import { getMediaImagePayload, type MovieItem } from '@/lib/tmdb';

function hasTmdbPoster(item: MovieItem) {
  return Boolean(item.posterUrl?.includes('image.tmdb.org'));
}

export async function enrichSectionImages(items: MovieItem[]) {
  return Promise.all(items.map(async (item) => {
    if (hasTmdbPoster(item)) return item;

    try {
      const images = await getMediaImagePayload(item.mediaType, item.id);
      if (images.source !== 'tmdb') return item;
      return {
        ...item,
        posterUrl: images.posterUrl || item.posterUrl,
        backdropUrl: images.backdropUrl || item.backdropUrl,
      };
    } catch {
      return item;
    }
  }));
}
