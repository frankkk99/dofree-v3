import { NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin-auth';
import { syncProfiles, type SyncProfile } from '@/lib/admin-sync-center';
import { supabaseRest, supabaseRestCount } from '@/lib/supabase-rest';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type LatestRow = {
  synced_at?: string | null;
  updated_at?: string | null;
};

const targetCount = 1000;

function baseFilter(profile: SyncProfile) {
  const filters = [`source_bucket=eq.${encodeURIComponent(profile.sourceBucket)}`];
  if (profile.mediaType === 'movie' || profile.mediaType === 'tv') filters.push(`media_type=eq.${profile.mediaType}`);
  return filters.join('&');
}

async function count(path: string) {
  try {
    return await supabaseRestCount(path, { mode: 'service', cache: 'no-store' });
  } catch {
    return 0;
  }
}

async function latestSync(profile: SyncProfile) {
  try {
    const rows = await supabaseRest<LatestRow[]>(
      `tmdb_catalog?${baseFilter(profile)}&select=synced_at,updated_at&order=synced_at.desc.nullslast&limit=1`,
      { mode: 'service', cache: 'no-store' },
    );
    const row = rows?.[0];
    return row?.synced_at || row?.updated_at || null;
  } catch {
    return null;
  }
}

function recommendedAction(total: number, missingMetadata: number) {
  if (total <= 0) return 'sync-now';
  if (missingMetadata > Math.max(5, Math.round(total * 0.18))) return 'enrich';
  if (total < 120) return 'add-more';
  return 'ok';
}

function actionLabel(action: string) {
  if (action === 'sync-now') return 'ควรดึง';
  if (action === 'enrich') return 'ควรเติม Metadata';
  if (action === 'add-more') return 'ควรเติมเพิ่ม';
  return 'พอใช้แล้ว';
}

async function profileStat(profile: SyncProfile) {
  const filter = baseFilter(profile);
  const [total, movies, series, missingPoster, missingBackdrop, missingMetadata, rating7, latestSyncedAt] = await Promise.all([
    count(`tmdb_catalog?${filter}&select=tmdb_id`),
    count(`tmdb_catalog?${filter}&media_type=eq.movie&select=tmdb_id`),
    count(`tmdb_catalog?${filter}&media_type=eq.tv&select=tmdb_id`),
    count(`tmdb_catalog?${filter}&poster_url=is.null&select=tmdb_id`),
    count(`tmdb_catalog?${filter}&backdrop_url=is.null&select=tmdb_id`),
    count(`tmdb_catalog?${filter}&or=(poster_url.is.null,backdrop_url.is.null,overview.is.null)&select=tmdb_id`),
    count(`tmdb_catalog?${filter}&rating=gte.7&select=tmdb_id`),
    latestSync(profile),
  ]);
  const action = recommendedAction(total, missingMetadata);

  return {
    profileId: profile.id,
    label: profile.label,
    shortLabel: profile.shortLabel,
    description: profile.description,
    sourceBucket: profile.sourceBucket,
    mediaType: profile.mediaType,
    kind: profile.kind,
    targetCount,
    existingCount: total,
    movieCount: movies,
    seriesCount: series,
    missingPoster,
    missingBackdrop,
    missingMetadata,
    rating7Count: rating7,
    estimatedNeed: Math.max(targetCount - total, 0),
    latestSyncedAt,
    recommendedAction: action,
    recommendedLabel: actionLabel(action),
  };
}

export async function GET(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const stats = await Promise.all(syncProfiles.map(profileStat));
    return NextResponse.json({ ok: true, generatedAt: new Date().toISOString(), targetCount, stats });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot load profile counts' }, { status: 500 });
  }
}
