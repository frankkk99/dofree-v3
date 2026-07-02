import { NextResponse } from 'next/server';
import { isAdminRole } from '@/lib/admin-access-control';
import {
  mediaClipLanguages,
  mediaClipSpoilerLevels,
  mediaClipStatuses,
  mediaClipTypes,
  type MediaClipInput,
  type MediaClipLanguage,
  type MediaClipRow,
  type MediaClipSpoilerLevel,
  type MediaClipStatus,
  type MediaClipType,
} from '@/lib/media-clips';
import type { MediaType } from '@/lib/tmdb';
import { supabaseRest } from '@/lib/supabase-rest';
import { parseYouTubeUrl } from '@/lib/youtube-url';

type AuthUser = {
  id: string;
  email?: string;
  phone?: string;
};

type ProfileRecord = {
  id: string;
  role?: string | null;
};

type ClipPatchInput = Partial<MediaClipInput> & {
  id?: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
}

function anonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function bearer(request: Request) {
  const header = request.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  return token || null;
}

async function currentUser(token: string) {
  const url = supabaseUrl();
  const key = anonKey();
  if (!url || !key) throw new Error('Missing Supabase public env');

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error('Unauthorized');
  return (await response.json()) as AuthUser;
}

async function requireAdmin(request: Request) {
  const token = bearer(request);
  if (!token) return { error: jsonError('Login required', 401) };

  const user = await currentUser(token);
  const rows = await supabaseRest<ProfileRecord[]>(
    `profiles?id=eq.${encodeURIComponent(user.id)}&select=id,role&limit=1`,
    { mode: 'service', cache: 'no-store' },
  );
  const role = rows?.[0]?.role || 'viewer';
  if (!isAdminRole(role)) return { error: jsonError('Admin permission required', 403) };

  return { user, role };
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback?: T) {
  if (typeof value === 'string' && allowed.includes(value as T)) return value as T;
  return fallback;
}

function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalText(value: unknown) {
  const text = textValue(value);
  return text || null;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function genreList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => textValue(item)).filter(Boolean).slice(0, 12);
}

function clipPayload(input: MediaClipInput | ClipPatchInput, existing?: MediaClipRow) {
  const title = textValue(input.title ?? existing?.title);
  if (!title) throw new Error('Title is required');

  const youtubeUrl = textValue(input.youtubeUrl ?? existing?.youtube_url);
  const parsed = input.youtubeUrl || !existing ? parseYouTubeUrl(youtubeUrl) : {
    videoId: existing.youtube_video_id,
    embedUrl: existing.embed_url,
    thumbnailUrl: existing.thumbnail_url || `https://img.youtube.com/vi/${existing.youtube_video_id}/hqdefault.jpg`,
    originalUrl: existing.youtube_url,
  };
  if (!parsed) throw new Error('Invalid YouTube URL');

  const mediaType = enumValue(input.mediaType ?? existing?.media_type, ['movie', 'tv'] satisfies MediaType[]);

  return {
    title,
    description: optionalText(input.description ?? existing?.description),
    youtube_url: parsed.originalUrl,
    youtube_video_id: parsed.videoId,
    embed_url: parsed.embedUrl,
    thumbnail_url: parsed.thumbnailUrl,
    clip_type: enumValue(input.clipType ?? existing?.clip_type, mediaClipTypes, existing?.clip_type || 'shorts') as MediaClipType,
    spoiler_level: enumValue(input.spoilerLevel ?? existing?.spoiler_level, mediaClipSpoilerLevels, existing?.spoiler_level || 'none') as MediaClipSpoilerLevel,
    language: enumValue(input.language ?? existing?.language, mediaClipLanguages, existing?.language || 'thai') as MediaClipLanguage,
    media_type: mediaType || null,
    tmdb_id: numberValue(input.tmdbId ?? existing?.tmdb_id),
    media_title: optionalText(input.mediaTitle ?? existing?.media_title),
    media_slug: optionalText(input.mediaSlug ?? existing?.media_slug),
    poster_url: optionalText(input.posterUrl ?? existing?.poster_url),
    genres: Array.isArray(input.genres) ? genreList(input.genres) : existing?.genres || [],
    status: enumValue(input.status ?? existing?.status, mediaClipStatuses, existing?.status || 'draft') as MediaClipStatus,
    show_home: booleanValue(input.showHome ?? existing?.show_home, existing?.show_home || false),
    show_clips: booleanValue(input.showClips ?? existing?.show_clips, existing?.show_clips ?? true),
    sort_order: numberValue(input.sortOrder ?? existing?.sort_order) || 0,
  };
}

async function readClip(id: string) {
  const rows = await supabaseRest<MediaClipRow[]>(
    `media_clips?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    { mode: 'service', cache: 'no-store' },
  );
  return rows?.[0] || null;
}

function requestedId(request: Request, body?: ClipPatchInput) {
  const url = new URL(request.url);
  return textValue(body?.id || url.searchParams.get('id'));
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit') || 50), 100));
    const rows = await supabaseRest<MediaClipRow[]>(
      `media_clips?select=*&order=sort_order.asc,created_at.desc&limit=${limit}`,
      { mode: 'service', cache: 'no-store' },
    );

    return NextResponse.json({ ok: true, clips: rows || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot load clips';
    return jsonError(message, message === 'Unauthorized' ? 401 : 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const input = (await request.json()) as MediaClipInput;
    const payload = clipPayload(input);
    const created = await supabaseRest<MediaClipRow[]>(
      'media_clips',
      {
        mode: 'service',
        method: 'POST',
        prefer: 'return=representation',
        body: payload,
        cache: 'no-store',
      },
    );

    return NextResponse.json({ ok: true, clip: created?.[0] || null }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot create clip';
    return jsonError(message, message === 'Unauthorized' ? 401 : 400);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const input = (await request.json()) as ClipPatchInput;
    const id = requestedId(request, input);
    if (!id) return jsonError('Clip id is required', 400);

    const existing = await readClip(id);
    if (!existing) return jsonError('Clip not found', 404);

    const payload = clipPayload(input, existing);
    const updated = await supabaseRest<MediaClipRow[]>(
      `media_clips?id=eq.${encodeURIComponent(id)}`,
      {
        mode: 'service',
        method: 'PATCH',
        prefer: 'return=representation',
        body: payload,
        cache: 'no-store',
      },
    );

    return NextResponse.json({ ok: true, clip: updated?.[0] || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot update clip';
    return jsonError(message, message === 'Unauthorized' ? 401 : 400);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const id = requestedId(request);
    if (!id) return jsonError('Clip id is required', 400);

    await supabaseRest<null>(
      `media_clips?id=eq.${encodeURIComponent(id)}`,
      { mode: 'service', method: 'DELETE', cache: 'no-store' },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot delete clip';
    return jsonError(message, message === 'Unauthorized' ? 401 : 400);
  }
}
