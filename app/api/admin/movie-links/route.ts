import { NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin-auth';
import { supabaseRest } from '@/lib/supabase-rest';

type MediaType = 'movie' | 'tv';
type MovieStatus = 'draft' | 'review' | 'published' | 'broken' | 'hidden';

type AdminMovieLink = {
  id?: string;
  tmdb_id: number;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  is_active?: boolean;
  notes?: string | null;
  section_slug: string;
  status: MovieStatus;
  created_at?: string;
  updated_at?: string;
};

type LinkReport = {
  id: string;
  tmdb_id?: number | null;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  url?: string | null;
  reason: string;
  detail?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

const validMediaTypes = new Set(['movie', 'tv']);
const validStatuses = new Set(['draft', 'review', 'published', 'broken', 'hidden']);

function cleanText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeDrivePreviewUrl(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const url = value.trim();
  if (!url) return null;

  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;

  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (url.includes('drive.google.com') && openMatch?.[1]) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;

  return url;
}

function playableStatus(requested: MovieStatus, watchUrl?: string | null) {
  if (!watchUrl) return requested === 'published' ? 'draft' : requested;
  if (requested === 'draft' || requested === 'review') return 'published';
  return requested;
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function actorDbId(actorId: string) {
  return actorId === 'admin-token' ? null : actorId;
}

function auditMeta(request: Request) {
  return {
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    user_agent: request.headers.get('user-agent') || null,
  };
}

async function writeAuditLog(input: {
  actorId: string;
  actorLabel: string;
  action: string;
  entityId: string;
  beforeData?: unknown;
  afterData?: unknown;
  request: Request;
}) {
  await supabaseRest('admin_audit_logs', {
    method: 'POST',
    mode: 'service',
    prefer: 'return=minimal',
    body: [{
      actor_id: actorDbId(input.actorId),
      actor_label: input.actorLabel,
      action: input.action,
      entity_type: 'admin_movie_links',
      entity_id: input.entityId,
      before_data: input.beforeData || null,
      after_data: input.afterData || null,
      ...auditMeta(input.request),
    }],
  }).catch(() => null);
}

async function existingLink(tmdbId: number, mediaType: MediaType) {
  const rows = await supabaseRest<AdminMovieLink[]>(
    `admin_movie_links?tmdb_id=eq.${tmdbId}&media_type=eq.${mediaType}&select=*&limit=1`,
    { mode: 'service', cache: 'no-store' }
  ).catch(() => []);
  return rows?.[0] || null;
}

export async function GET(request: Request) {
  const auth = await requireAdminAccess(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  try {
    const [links, reports] = await Promise.all([
      supabaseRest<AdminMovieLink[]>(
        'admin_movie_links?select=id,tmdb_id,media_type,title,title_th,watch_url,trailer_url,provider,is_active,notes,section_slug,status,created_at,updated_at&order=updated_at.desc&limit=2000',
        { mode: 'service', cache: 'no-store' }
      ),
      supabaseRest<LinkReport[]>(
        'link_reports?select=id,tmdb_id,media_type,title,title_th,url,reason,detail,status,created_at,updated_at&order=created_at.desc&limit=100',
        { mode: 'service', cache: 'no-store' }
      ).catch(() => []),
    ]);

    return NextResponse.json({ ok: true, links, reports });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Cannot load admin movie links', 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminAccess(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const tmdbId = Number(body?.tmdb_id);
  const mediaType = cleanText(body?.media_type) as MediaType | undefined;
  const requestedStatus = (cleanText(body?.status) || 'published') as MovieStatus;
  const watchUrl = normalizeDrivePreviewUrl(body?.watch_url);
  const status = playableStatus(requestedStatus, watchUrl);

  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return jsonError('TMDB ID ไม่ถูกต้อง');
  if (!mediaType || !validMediaTypes.has(mediaType)) return jsonError('media_type ต้องเป็น movie หรือ tv');
  if (!validStatuses.has(status)) return jsonError('status ไม่ถูกต้อง');
  if (status === 'published' && !watchUrl) return jsonError('Published ต้องมีลิงก์รับชม');

  const record = {
    tmdb_id: tmdbId,
    media_type: mediaType,
    title: cleanText(body?.title) || null,
    title_th: cleanText(body?.title_th) || cleanText(body?.title) || null,
    watch_url: watchUrl || null,
    trailer_url: normalizeDrivePreviewUrl(body?.trailer_url) || null,
    provider: cleanText(body?.provider) || 'admin',
    section_slug: cleanText(body?.section_slug) || 'watch-ready',
    status,
    is_active: status !== 'hidden',
    notes: cleanText(body?.notes) || null,
  };

  try {
    const before = await existingLink(tmdbId, mediaType);
    const rows = await supabaseRest<AdminMovieLink[]>('admin_movie_links?on_conflict=tmdb_id,media_type', {
      method: 'POST',
      mode: 'service',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: [record],
    });

    const link = rows?.[0] || null;
    await writeAuditLog({
      actorId: auth.actor.id,
      actorLabel: auth.actor.label,
      action: before ? 'update_movie_link' : 'create_movie_link',
      entityId: `${mediaType}:${tmdbId}`,
      beforeData: before,
      afterData: link,
      request,
    });

    return NextResponse.json({ ok: true, link });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Cannot save movie link', 500);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminAccess(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const id = cleanText(body?.id);
  if (!id) return jsonError('Missing link id');

  const patch: Record<string, unknown> = {};
  const status = cleanText(body?.status) as MovieStatus | undefined;
  if (status) {
    if (!validStatuses.has(status)) return jsonError('status ไม่ถูกต้อง');
    patch.status = status;
    patch.is_active = status !== 'hidden';
  }

  if (typeof body?.watch_url === 'string') {
    const watchUrl = normalizeDrivePreviewUrl(body.watch_url);
    patch.watch_url = watchUrl || null;
    const nextStatus = playableStatus((patch.status as MovieStatus | undefined) || 'published', watchUrl);
    patch.status = nextStatus;
    patch.is_active = nextStatus !== 'hidden';
  }

  if (typeof body?.trailer_url === 'string') patch.trailer_url = normalizeDrivePreviewUrl(body.trailer_url) || null;
  if (typeof body?.title === 'string') patch.title = cleanText(body.title) || null;
  if (typeof body?.title_th === 'string') patch.title_th = cleanText(body.title_th) || null;
  if (typeof body?.section_slug === 'string') patch.section_slug = cleanText(body.section_slug) || 'watch-ready';
  if (typeof body?.provider === 'string') patch.provider = cleanText(body.provider) || 'admin';
  if (typeof body?.notes === 'string') patch.notes = cleanText(body.notes) || null;

  try {
    const beforeRows = await supabaseRest<AdminMovieLink[]>(`admin_movie_links?id=eq.${encodeURIComponent(id)}&select=*&limit=1`, {
      mode: 'service',
      cache: 'no-store',
    });
    const before = beforeRows?.[0] || null;

    const rows = await supabaseRest<AdminMovieLink[]>(`admin_movie_links?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      mode: 'service',
      prefer: 'return=representation',
      body: patch,
    });

    const link = rows?.[0] || null;
    await writeAuditLog({
      actorId: auth.actor.id,
      actorLabel: auth.actor.label,
      action: 'patch_movie_link',
      entityId: before ? `${before.media_type}:${before.tmdb_id}` : id,
      beforeData: before,
      afterData: link,
      request,
    });

    return NextResponse.json({ ok: true, link });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Cannot update movie link', 500);
  }
}
