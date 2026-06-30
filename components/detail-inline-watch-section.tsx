import { InlineWatchPlayer } from '@/components/inline-watch-player';
import { getPublishedSeriesEpisodes } from '@/lib/series-episodes';
import { getWatchSourceUrl, type MediaType } from '@/lib/tmdb';

type DetailInlineWatchSectionProps = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  fallbackImage: string;
};

export async function DetailInlineWatchSection({ tmdbId, mediaType, title, fallbackImage }: DetailInlineWatchSectionProps) {
  const seriesEpisodes = mediaType === 'tv' ? await getPublishedSeriesEpisodes(tmdbId) : [];
  const firstEpisodeSourceUrl = seriesEpisodes[0]?.watch_url || undefined;
  const movieSourceUrl = mediaType === 'movie' ? await getWatchSourceUrl(mediaType, tmdbId) : undefined;
  const sourceUrl = mediaType === 'tv' ? firstEpisodeSourceUrl || await getWatchSourceUrl(mediaType, tmdbId) : movieSourceUrl;
  const episodes = seriesEpisodes
    .map((episode) => ({
      key: `${episode.season_number}-${episode.episode_number}`,
      label: `ตอนที่ ${episode.episode_number}${episode.episode_title ? ` · ${episode.episode_title}` : ''}`,
      sourceUrl: episode.watch_url || '',
    }))
    .filter((episode) => episode.sourceUrl);

  return <InlineWatchPlayer tmdbId={tmdbId} mediaType={mediaType} title={title} fallbackImage={fallbackImage} sourceUrl={sourceUrl} episodes={episodes} />;
}
