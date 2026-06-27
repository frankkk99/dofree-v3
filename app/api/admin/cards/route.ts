import { NextResponse } from 'next/server';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { requireAdminAccess } from '@/lib/admin-auth';
import { supabaseRest } from '@/lib/supabase-rest';

type CardRow = {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  title_en?: string | null;
  poster_url?: string | null;
  rating?: number | string | null;
  release_year?: string | null;
  source_bucket?: string | null;
  sort_score?: number | string | null;
  is_active: boolean;
  updated_at?: string;
};

const select = 'tmdb_id,media_type,title,title_en,poster_url,rating,release_year,source_bucket,sort_score,is_active,updated_at';

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

async function auth(request: Request) {
  const result = await requireAdminAccess(request);
  if (result.ok === true) return { actor: result };
  return { response: NextResponse.json({ ok: false, error: result.error }, { status: result.status }) };
}

export async function GET(request: Request) {
  const access = await auth(request);
  if (access.response) return access.response;
  const params = new URL(request.url).searchParams;
  const q = text(params.get('q'));
  const bucket = text(params.get('bucket'));
  const active = params.get('active');
  const limit = Math.max(1, Math.min(Number(params.get('limit') || 80), 200));
  const filters = [`select=${select}`, 'order=sort_score.desc', `limit=${limit}`];
  if (bucket && bucket !== 'all') filters.push(`source_bucket=eq.${encodeURIComponent(bucket)}`);
  if (active === 'true' || active === 'false') filters.push(`is_active=eq.${active}`);
  if (q) {
    const keyword = encodeURIComponent(q.replace(/[,*()]/g, ' '));
    filters.push(`or=(title.ilike.*${keyword}*,title_en.ilike.*${keyword}*)`);
  }
  const cards = await supabaseRest<CardRow[]>(`tmdb_catalog?${filters.join('&')}`, { mode: 'service' });
  return NextResponse.json({ ok: true, cards });
}

export async function PATCH(request: Request) {
  const access = await auth(request);
  if (access.response) return access.response;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const tmdbId = Number(body?.tmdb_id);
  const mediaType = text(body?.media_type);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0 || (mediaType !== 'movie' && mediaType !== 'tv')) {
    return NextResponse.json({ ok: false, error: 'ต้องมี tmdb_id และ media_type' }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body?.is_active === 'boolean') patch.is_active = body.is_active;
  const bucket = text(body?.source_bucket);
  if (bucket !== undefined) patch.source_bucket = bucket;
  if (body?.sort_score !== undefined) patch.sort_score = Number(body.sort_score);

  const before = await supabaseRest<CardRow[]>(`tmdb_catalog?tmdb_id=eq.${tmdbId}&media_type=eq.${encodeURIComponent(mediaType)}&select=${select}&limit=1`, { mode: 'service' }).then((rows) => rows[0]).catch(() => null);
  const rows = await supabaseRest<CardRow[]>(`tmdb_catalog?tmdb_id=eq.${tmdbId}&media_type=eq.${encodeURIComponent(mediaType)}`, { method: 'PATCH', mode: 'service', prefer: 'return=representation', body: patch });

  if (typeof body?.is_active === 'boolean') {
    await supabaseRest(`admin_movie_links?tmdb_id=eq.${tmdbId}&media_type=eq.${encodeURIComponent(mediaType)}`, { method: 'PATCH', mode: 'service', body: { is_active: body.is_active, status: body.is_active ? 'published' : 'hidden' } }).catch(() => null);
  }

  await recordAdminAuditLog({ request, actor: access.actor, action: 'card.patch', entityType: 'tmdb_catalog', entityId: `${mediaType}-${tmdbId}`, beforeData: before, afterData: rows[0] || patch });
  return NextResponse.json({ ok: true, card: rows[0] || null });
}
