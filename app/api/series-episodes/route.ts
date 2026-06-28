import { NextResponse } from 'next/server';
import { episodeWatchHref, getPublishedSeriesEpisodes } from '@/lib/series-episodes';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tmdbId = Number(searchParams.get('tmdbId'));

  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid series request' }, { status: 400 });
  }

  const rows = await getPublishedSeriesEpisodes(tmdbId);
  const episodes = rows.map((episode) => ({
    seasonNumber: episode.season_number,
    episodeNumber: episode.episode_number,
    title: episode.episode_title || null,
    href: episodeWatchHref('tv', tmdbId, episode),
  }));

  return NextResponse.json({ ok: true, episodes });
}
