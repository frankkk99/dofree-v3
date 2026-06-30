import { supabaseRest } from './supabase-rest';
import type { MediaType } from './tmdb';

export type SeriesEpisodeStatus = 'draft' | 'review' | 'published' | 'broken' | 'hidden';

export type SeriesEpisode = {
  id?: string;
  tmdb_id: number;
  media_type?: 'tv';
  season_number: number;
  episode_number: number;
  episode_title?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  notes?: string | null;
  status?: SeriesEpisodeStatus;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type SeriesSeason = {
  seasonNumber: number;
  episodes: SeriesEpisode[];
};

export type SeriesEpisodeSummary = {
  tmdbId: number;
  firstWatchUrl?: string;
  episodeCount: number;
};

function normalizeDrivePreviewUrl(value?: string | null) {
  const url = value?.trim();
  if (!url) return undefined;
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (url.includes('drive.google.com') && openMatch?.[1]) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  return url;
}

function normalizeEpisode(row: SeriesEpisode): SeriesEpisode {
  return {
    ...row,
    tmdb_id: Number(row.tmdb_id),
    season_number: Number(row.season_number || 1),
    episode_number: Number(row.episode_number || 1),
    watch_url: normalizeDrivePreviewUrl(row.watch_url) || null,
    trailer_url: normalizeDrivePreviewUrl(row.trailer_url) || null,
    status: row.status || 'published',
    is_active: row.is_active !== false,
  };
}

function activeEpisodeFilter(tmdbIds: number[]) {
  const ids = [...new Set(tmdbIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (!ids.length) return null;
  return `admin_series_episodes?tmdb_id=in.(${ids.join(',')})&is_active=eq.true&status=eq.published&watch_url=not.is.null&select=id,tmdb_id,media_type,season_number,episode_number,episode_title,watch_url,trailer_url,provider,notes,status,is_active,created_at,updated_at&order=season_number.asc,episode_number.asc`;
}

export function episodeWatchHref(mediaType: MediaType, tmdbId: number, episode?: Pick<SeriesEpisode, 'season_number' | 'episode_number'>) {
  if (mediaType !== 'tv' || !episode) return `/${mediaType}/${tmdbId}#watch`;
  return `/tv/${tmdbId}#watch`;
}

export function groupSeriesEpisodes(episodes: SeriesEpisode[]): SeriesSeason[] {
  const map = new Map<number, SeriesEpisode[]>();
  for (const episode of episodes) {
    const seasonNumber = Number(episode.season_number || 1);
    map.set(seasonNumber, [...(map.get(seasonNumber) || []), episode]);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([seasonNumber, rows]) => ({
      seasonNumber,
      episodes: rows.sort((a, b) => Number(a.episode_number) - Number(b.episode_number)),
    }));
}

export async function getSeriesEpisodes(tmdbId: string | number) {
  const numericId = Number(tmdbId);
  if (!Number.isInteger(numericId) || numericId <= 0) return [];

  try {
    const rows = await supabaseRest<SeriesEpisode[]>(
      `admin_series_episodes?tmdb_id=eq.${numericId}&is_active=eq.true&select=id,tmdb_id,media_type,season_number,episode_number,episode_title,watch_url,trailer_url,provider,notes,status,is_active,created_at,updated_at&order=season_number.asc,episode_number.asc`,
      { mode: 'service', cache: 'no-store' },
    );
    return (rows || []).map(normalizeEpisode);
  } catch {
    return [];
  }
}

export async function getPublishedSeriesEpisodes(tmdbId: string | number) {
  return (await getSeriesEpisodes(tmdbId)).filter((episode) => episode.status === 'published' && Boolean(episode.watch_url));
}

export async function getSeriesEpisodeSummaries(tmdbIds: number[]) {
  const endpoint = activeEpisodeFilter(tmdbIds);
  const summaries = new Map<number, SeriesEpisodeSummary>();
  if (!endpoint) return summaries;

  try {
    const rows = (await supabaseRest<SeriesEpisode[]>(endpoint, { mode: 'service', cache: 'no-store' })).map(normalizeEpisode);
    for (const row of rows) {
      const current = summaries.get(row.tmdb_id) || { tmdbId: row.tmdb_id, episodeCount: 0 };
      summaries.set(row.tmdb_id, {
        tmdbId: row.tmdb_id,
        firstWatchUrl: current.firstWatchUrl || row.watch_url || undefined,
        episodeCount: current.episodeCount + 1,
      });
    }
  } catch {
    return summaries;
  }

  return summaries;
}

export async function getSeriesEpisodeSourceUrl(tmdbId: string | number, season: string | number, episode: string | number) {
  const numericId = Number(tmdbId);
  const seasonNumber = Number(season);
  const episodeNumber = Number(episode);
  if (!Number.isInteger(numericId) || !Number.isInteger(seasonNumber) || !Number.isInteger(episodeNumber)) return undefined;

  const rows = await getPublishedSeriesEpisodes(numericId);
  const match = rows.find((row) => row.season_number === seasonNumber && row.episode_number === episodeNumber);
  return normalizeDrivePreviewUrl(match?.watch_url);
}
