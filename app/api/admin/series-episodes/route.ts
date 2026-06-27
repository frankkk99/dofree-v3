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

function asPayloadList(body: Record<string, unknown> | null) {
  if (!body) return [];
  if (Array.isArray(body.episodes)) return body.episodes.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
  return [body];
}

function toEpisodeRecord(payload: Record<string, unknown>, fallbackTmdbId?: number) {
  const tmdbId = Number(payload.tmdb_id || fallbackTmdbId);
  const seasonNumber = Number(payload.season_number || 1);
  const episodeNumber = Number(payload.episode_number);
  const requestedStatus = (cleanText(payload.status) || 'published') as SeriesEpisodeStatus;
  const watchUrl = normalizeDrivePreviewUrl(cleanText(payload.watch_url));
  const status = requestedStatus === 'published' && !watchUrl ? 'draft' : requestedStatus;

  if (!Number.isInteger(tmdbId) || tmdbId <= 0) throw new Error('Invalid TMDB ID');
  if (!Number.isInteger(seasonNumber) || seasonNumber <= 0) throw new Error('Season must be greater than 0');
  if (!Number.isInteger(episodeNumber) || episodeNumber <= 0) throw new Error('Episode must be greater than 0');
  if (!validStatuses.has(status)) throw new Error('Invalid status');

  return {
    tmdb_id: tmdbId,
    media_type: 'tv',
    season_number: seasonNumber,
    episode_number: episodeNumber,
    episode_title: cleanText(payload.episode_title) || null,
    watch_url: watchUrl,
    trailer_url: normalizeDrivePreviewUrl(cleanText(payload.trailer_url)),
    provider: cleanText(payload.provider) || 'admin',
    notes: cleanText(payload.notes) || null,
    status,
    is_active: status !== 'hidden',
  };
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
  const payloads = asPayloadList(body);
  if (!payloads.length) return NextResponse.json({ ok: false, error: 'No episodes to save' }, { status: 400 });
  if (payloads.length > 80) return NextResponse.json({ ok: false, error: 'Save up to 80 episodes at a time' }, { status: 400 });

  try {
    const fallbackTmdbId = Number(body?.tmdb_id);
    const records = payloads.map((payload) => toEpisodeRecord(payload, fallbackTmdbId));
    const tmdbIds = new Set(records.map((record) => record.tmdb_id));
    if (tmdbIds.size !== 1) return NextResponse.json({ ok: false, error: 'Episodes must belong to one TMDB ID' }, { status: 400 });

    const beforeRows = await Promise.all(records.map((record) => fetchEpisodeByKey(record.tmdb_id, record.season_number, record.episode_number)));
    const rows = await supabaseRest<SeriesEpisode[]>('admin_series_episodes?on_conflict=tmdb_id,season_number,episode_number', {
      method: 'POST',
      mode: 'service',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: records,
    });
    const savedRows = rows.length ? rows : records;

    await recordAdminAuditLog({
      request,
      actor: auth,
      action: records.length > 1 ? 'series_episode.bulk_upsert' : beforeRows[0] ? 'series_episode.upsert.update' : 'series_episode.upsert.create',
      entityType: 'admin_series_episodes',
      entityId: `${records[0].tmdb_id}-${records.length}-episodes`,
      beforeData: records.length > 1 ? beforeRows.filter(Boolean) : beforeRows[0],
      afterData: records.length > 1 ? savedRows : savedRows[0],
    });

    return NextResponse.json({ ok: true, episode: savedRows[0], episodes: savedRows, saved: savedRows.length });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot save episode' }, { status: 500 });
  }
}
