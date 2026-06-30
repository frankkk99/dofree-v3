import type { InlineWatchEpisode } from '@/components/inline-watch-player';
import { getPublishedSeriesEpisodes } from '@/lib/series-episodes';
import { getWatchSourceUrl, type MediaType } from '@/lib/tmdb';
import { createWatchSourceToken } from '@/lib/watch-source-token';

export function protectedInlineWatchUrl(sourceUrl: string | undefined | null, mediaType: MediaType, id: number) {
  if (!sourceUrl) return undefined;
  try {
    const token = createWatchSourceToken({ url: sourceUrl, mediaType, id }, 60 * 60);
    return `/api/watch/source?token=${encodeURIComponent(token)}`;
  } catch {
    return undefined;
  }
}

export function inlineEpisodeKey(seasonNumber: number, episodeNumber: number) {
  return `${seasonNumber}-${episodeNumber}`;
}

export async function getInlineWatchSource(mediaType: MediaType, id: string | number) {
  const numericId = Number(id);
  if (!numericId) return undefined;
  return protectedInlineWatchUrl(await getWatchSourceUrl(mediaType, numericId), mediaType, numericId);
}

export async function getInlineTvEpisodes(tmdbId: string | number): Promise<InlineWatchEpisode[]> {
  const numericId = Number(tmdbId);
  if (!numericId) return [];
  const rows = await getPublishedSeriesEpisodes(numericId);
  return rows.map((row) => ({
    key: inlineEpisodeKey(row.season_number, row.episode_number),
    label: `ตอนที่ ${row.episode_number}`,
    title: row.episode_title,
    sourceUrl: protectedInlineWatchUrl(row.watch_url, 'tv', numericId),
    seasonNumber: row.season_number,
    episodeNumber: row.episode_number,
  }));
}
