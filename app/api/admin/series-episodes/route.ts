import { NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin-auth';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { getSeriesEpisodes, type SeriesEpisode, type SeriesEpisodeStatus } from '@/lib/series-episodes';
import { supabaseRest } from '@/lib/supabase-rest';

const validStatuses = new Set<SeriesEpisodeStatus>(['draft', 'review', 'published', 'broken', 'hidden']);

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDrivePreviewUrl(value?: string | null) {
  const url = value?.trim();
  if (!url) return null;
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (url.includes('drive.google.com') && openMatch?.[1]) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  return url;
}

async function fetchEpisodeByKey(tmdbId: number, seasonNumber: number, episodeNumber: number) {
  const rows = await supabaseRest<SeriesEpisode[]>(
    `admin_series_episodes?tmdb_id=eq.${tmdbId}&season_number=eq.${seasonNumber}&episode_number=eq.${episodeNumber}&select=id,tmdb_id,media_type,season_number,episode_number,episode_title,watch_url,trailer_url,provider,notes,status,is_active,created_at,updated_at&limit=1`,
    { mode: 'service', cache: 'no-store' },
  ).catch(() => []);
  return rows[0] || null;
}

export async function GET(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const tmdbId = Number(searchParams.get('tmdbId'));
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return NextResponse.json({ ok: false, error: 'Invalid TMDB ID' }, { status: 400 });

  const episodes = await getSeriesEpisodes(tmdbId);
  return NextResponse.json({ ok: true, episodes });
}

export async function POST(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const tmdbId = Number(body?.tmdb_id);
  const seasonNumber = Number(body?.season_number);
  const episodeNumber = Number(body?.episode_number);
  const status = (cleanText(body?.status) || 'published') as SeriesEpisodeStatus;
  const watchUrl = normalizeDrivePreviewUrl(cleanText(body?.watch_url));

  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return NextResponse.json({ ok: false, error: 'Invalid TMDB ID' }, { status: 400 });
  if (!Number.isInteger(seasonNumber) || seasonNumber <= 0) return NextResponse.json({ ok: false, error: 'Season must be greater than 0' }, { status: 400 });
  if (!Number.isInteger(episodeNumber) || episodeNumber <= 0) return NextResponse.json({ ok: false, error: 'Episode must be greater than 0' }, { status: 400 });
  if (!validStatuses.has(status)) return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 });
  if (status === 'published' && !watchUrl) return NextResponse.json({ ok: false, error: 'Published episode needs a watch URL' }, { status: 400 });

  const record = {
    tmdb_id: tmdbId,
    media_type: 'tv',
    season_number: seasonNumber,
    episode_number: episodeNumber,
    episode_title: cleanText(body?.episode_title) || null,
    watch_url: watchUrl,
    trailer_url: normalizeDrivePreviewUrl(cleanText(body?.trailer_url)),
    provider: cleanText(body?.provider) || 'admin',
    notes: cleanText(body?.notes) || null,
    status,
    is_active: status !== 'hidden',
  };

  try {
    const before = await fetchEpisodeByKey(tmdbId, seasonNumber, episodeNumber);
    const rows = await supabaseRest<SeriesEpisode[]>('admin_series_episodes?on_conflict=tmdb_id,season_number,episode_number', {
      method: 'POST',
      mode: 'service',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: [record],
    });
    const saved = rows[0] || record;

    await recordAdminAuditLog({
      request,
      actor: auth,
      action: before ? 'series_episode.upsert.update' : 'series_episode.upsert.create',
      entityType: 'admin_series_episodes',
      entityId: before?.id || `${tmdbId}-s${seasonNumber}e${episodeNumber}`,
      beforeData: before,
      afterData: saved,
    });

    return NextResponse.json({ ok: true, episode: saved });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot save episode' }, { status: 500 });
  }
}
