import { NextResponse } from 'next/server';
import { requireAdminToken } from '@/lib/admin-auth';
import { supabaseRest } from '@/lib/supabase-rest';

type MediaType = 'movie' | 'tv';
type MovieStatus = 'draft' | 'review' | 'published' | 'broken' | 'hidden';

type AdminMovieLink = {
  id: string;
  tmdb_id: number;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  is_active: boolean;
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
  const url = cleanText(value);
  if (!url) return undefined;

  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;

  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (url.includes('drive.google.com') && openMatch?.[1]) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;

  return url;
}

function authError(request: Request) {
  const auth = requireAdminToken(request);
  if (auth.ok) return null;
  return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
}

export async function GET(request: Request) {
  const errorResponse = authError(request);
  if (errorResponse) return errorResponse;

  try {
    const [links, reports] = await Promise.all([
      supabaseRest<AdminMovieLink[]>(
        'admin_movie_links?select=id,tmdb_id,media_type,title,title_th,watch_url,trailer_url,provider,is_active,notes,section_slug,status,created_at,updated_at&order=updated_at.desc&limit=80',
        { mode: 'service' }
      ),
      supabaseRest<LinkReport[]>(
        'link_reports?select=id,tmdb_id,media_type,title,title_th,url,reason,detail,status,created_at,updated_at&order=created_at.desc&limit=50',
        { mode: 'service' }
      ),
    ]);

    return NextResponse.json({ ok: true, links, reports });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot load admin dashboard' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const errorResponse = authError(request);
  if (errorResponse) return errorResponse;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const tmdbId = Number(body?.tmdb_id);
  const mediaType = cleanText(body?.media_type) as MediaType | undefined;
  const status = (cleanText(body?.status) || 'published') as MovieStatus;
  const watchUrl = normalizeDrivePreviewUrl(body?.watch_url);

  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ ok: false, error: 'TMDB ID ไม่ถูกต้อง' }, { status: 400 });
  }

  if (!mediaType || !validMediaTypes.has(mediaType)) {
    return NextResponse.json({ ok: false, error: 'media_type ต้องเป็น movie หรือ tv' }, { status: 400 });
  }

  if (!validStatuses.has(status)) {
    return NextResponse.json({ ok: false, error: 'status ไม่ถูกต้อง' }, { status: 400 });
  }

  if (status === 'published' && !watchUrl) {
    return NextResponse.json({ ok: false, error: 'Published ต้องมีลิงก์รับชม' }, { status: 400 });
  }

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
    const rows = await supabaseRest<AdminMovieLink[]>('admin_movie_links?on_conflict=tmdb_id,media_type', {
      method: 'POST',
      mode: 'service',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: [record],
    });

    return NextResponse.json({ ok: true, link: rows[0] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot save movie link' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const errorResponse = authError(request);
  if (errorResponse) return errorResponse;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = cleanText(body?.id);

  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing link id' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  const status = cleanText(body?.status) as MovieStatus | undefined;
  if (status) {
    if (!validStatuses.has(status)) return NextResponse.json({ ok: false, error: 'status ไม่ถูกต้อง' }, { status: 400 });
    patch.status = status;
    patch.is_active = status !== 'hidden';
  }

  const watchUrl = normalizeDrivePreviewUrl(body?.watch_url);
  if (watchUrl) patch.watch_url = watchUrl;
  const notes = cleanText(body?.notes);
  if (notes !== undefined) patch.notes = notes;

  try {
    const rows = await supabaseRest<AdminMovieLink[]>(`admin_movie_links?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      mode: 'service',
      prefer: 'return=representation',
      body: patch,
    });

    return NextResponse.json({ ok: true, link: rows[0] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot update movie link' }, { status: 500 });
  }
}
