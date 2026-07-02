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

type ClipPayload = {
  title: string;
  description: string | null;
  youtube_url: string;
  youtube_video_id: string;
  embed_url: string;
  thumbnail_url: string;
  clip_type: MediaClipType;
  spoiler_level: MediaClipSpoilerLevel;
  language: MediaClipLanguage;
  media_type: MediaType | null;
  tmdb_id: number | null;
  media_title: string | null;
  media_slug: string | null;
  poster_url: string | null;
  genres: string[];
  status: MediaClipStatus;
  show_home: boolean;
  show_clips: boolean;
  sort_order: number;
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
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function genreList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => textValue(item)).filter(Boolean).slice(0, 12);
}

function clipPayload(input: MediaClipInput | ClipPatchInput, existing?: MediaClipRow): ClipPayload {
  const title = textValue(input.title ?? existing?.title);
  if (!title) throw new Error('ต้องใส่ชื่อคลิป');

  const youtubeUrl = textValue(input.youtubeUrl ?? existing?.youtube_url);
  const parsed = input.youtubeUrl || !existing ? parseYouTubeUrl(youtubeUrl) : {
    videoId: existing.youtube_video_id,
    embedUrl: existing.embed_url,
    thumbnailUrl: existing.thumbnail_url || `https://img.youtube.com/vi/${existing.youtube_video_id}/hqdefault.jpg`,
    originalUrl: existing.youtube_url,
  };
  if (!parsed) throw new Error('YouTube URL ไม่ถูกต้อง');

  const mediaType = enumValue(input.mediaType ?? existing?.media_type, ['movie', 'tv'] satisfies MediaType[]);
  const status = enumValue(input.status ?? existing?.status, mediaClipStatuses, existing?.status || 'draft') as MediaClipStatus;
  const showHome = booleanValue(input.showHome ?? existing?.show_home, existing?.show_home || false);
  const showClips = booleanValue(input.showClips ?? existing?.show_clips, existing?.show_clips ?? true);

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
    status,
    show_home: showHome,
    show_clips: showClips,
    sort_order: numberValue(input.sortOrder ?? existing?.sort_order) ?? 0,
  };
}

function validateBusinessRules(payload: ClipPayload) {
  if (payload.status === 'published') {
    if (!payload.title || !payload.youtube_video_id || !payload.embed_url) throw new Error('คลิป Published ต้องมีชื่อและ YouTube URL ครบ');
    if (!payload.show_clips) throw new Error('คลิป Published ต้องเปิดแสดงหน้า Clips');
  }

  if (payload.show_home) {
    if (payload.status !== 'published') throw new Error('คลิปที่ขึ้นหน้าแรกต้องเป็น Published ก่อน');
    if (!payload.show_clips) throw new Error('คลิปที่ขึ้นหน้าแรกต้องเปิดแสดงหน้า Clips ด้วย');
  }

  if ((payload.media_type && !payload.tmdb_id) || (!payload.media_type && payload.tmdb_id)) {
    throw new Error('ถ้าผูกหนัง ต้องมีทั้ง Media Type และ TMDB ID');
  }
}

async function assertUniqueYouTube(videoId: string, currentId?: string) {
  const rows = await supabaseRest<Pick<MediaClipRow, 'id' | 'title'>[]>(
    `media_clips?youtube_video_id=eq.${encodeURIComponent(videoId)}&select=id,title&limit=5`,
    { mode: 'service', cache: 'no-store' },
  );
  const duplicate = (rows || []).find((clip) => clip.id !== currentId);
  if (duplicate) throw new Error(`YouTube นี้ถูกใช้แล้วในคลิป “${duplicate.title}”`);
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
    validateBusinessRules(payload);
    await assertUniqueYouTube(payload.youtube_video_id);

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
    validateBusinessRules(payload);
    await assertUniqueYouTube(payload.youtube_video_id, id);

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
