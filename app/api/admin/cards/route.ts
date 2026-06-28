// @ts-nocheck
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

function cardKey(card: Record<string, unknown>) {
  const tmdbId = Number(card.tmdb_id);
  const mediaType = text(card.media_type);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0 || (mediaType !== 'movie' && mediaType !== 'tv')) return null;
  return { tmdbId, mediaType };
}

async function auth(request: Request) {
  const result = await requireAdminAccess(request);
  if (result.ok === true) return { actor: result };
  return { response: NextResponse.json({ ok: false, error: result.error }, { status: result.status }) };
}

async function patchOne(card: Record<string, unknown>) {
  const parsed = cardKey(card);
  if (!parsed) return null;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof card.is_active === 'boolean') patch.is_active = card.is_active;
  if ('source_bucket' in card) patch.source_bucket = text(card.source_bucket) || null;
  if (card.sort_score !== undefined) patch.sort_score = Number(card.sort_score);

  const rows = await supabaseRest<CardRow[]>(`tmdb_catalog?tmdb_id=eq.${parsed.tmdbId}&media_type=eq.${encodeURIComponent(parsed.mediaType)}`, {
    method: 'PATCH',
    mode: 'service',
    prefer: 'return=representation',
    body: patch,
  });

  if (typeof card.is_active === 'boolean') {
    await supabaseRest(`admin_movie_links?tmdb_id=eq.${parsed.tmdbId}&media_type=eq.${encodeURIComponent(parsed.mediaType)}`, {
      method: 'PATCH',
      mode: 'service',
      body: { is_active: card.is_active, status: card.is_active ? 'published' : 'hidden' },
    }).catch(() => null);
  }

  return rows?.[0] || null;
}

export async function GET(request: Request) {
  const access = await auth(request);
  if (access.response) return access.response;
  const params = new URL(request.url).searchParams;
  const q = text(params.get('q'));
  const bucket = text(params.get('bucket'));
  const active = params.get('active');
  const limit = Math.max(1, Math.min(Number(params.get('limit') || 80), 500));
  const filters = [`select=${select}`, 'order=sort_score.desc.nullslast', `limit=${limit}`];
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
  const cards = Array.isArray(body?.cards) ? body.cards as Record<string, unknown>[] : null;

  if (cards?.length) {
    const updated: CardRow[] = [];
    for (const card of cards) {
      const row = await patchOne(card).catch(() => null);
      if (row) updated.push(row);
    }
    await recordAdminAuditLog({ request, actor: access.actor, action: 'cards.bulk_patch', entityType: 'tmdb_catalog', entityId: 'bulk', afterData: { count: updated.length } });
    return NextResponse.json({ ok: true, cards: updated });
  }

  const row = await patchOne(body || {});
  if (!row) return NextResponse.json({ ok: false, error: 'ต้องมี tmdb_id และ media_type' }, { status: 400 });
  await recordAdminAuditLog({ request, actor: access.actor, action: 'card.patch', entityType: 'tmdb_catalog', entityId: `${row.media_type}-${row.tmdb_id}`, afterData: row });
  return NextResponse.json({ ok: true, card: row });
}
