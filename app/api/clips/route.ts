import { NextResponse } from 'next/server';
import {
  mediaClipLanguages,
  mediaClipTypes,
  type MediaClipLanguage,
  type MediaClipRow,
  type MediaClipType,
} from '@/lib/media-clips';
import { supabaseRest } from '@/lib/supabase-rest';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function enumValue<T extends string>(value: string | null, allowed: readonly T[]) {
  return value && allowed.includes(value as T) ? value as T : null;
}

function numberParam(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(parsed, max));
}

function textParam(value: string | null) {
  return value?.trim() || '';
}

function buildPath(url: URL, fetchLimit: number, offset: number) {
  const params = new URLSearchParams();
  params.set('select', '*');
  params.set('status', 'eq.published');
  params.set('show_clips', 'eq.true');
  params.set('order', 'sort_order.asc,created_at.desc');
  params.set('limit', String(fetchLimit));
  params.set('offset', String(offset));

  if (url.searchParams.get('home') === 'true') params.set('show_home', 'eq.true');

  const id = textParam(url.searchParams.get('id') || url.searchParams.get('clip'));
  if (id) params.set('id', `eq.${id}`);

  const type = enumValue<MediaClipType>(url.searchParams.get('type'), mediaClipTypes);
  if (type) params.set('clip_type', `eq.${type}`);

  const language = enumValue<MediaClipLanguage>(url.searchParams.get('language'), mediaClipLanguages);
  if (language) params.set('language', `eq.${language}`);

  const mediaType = enumValue(url.searchParams.get('mediaType'), ['movie', 'tv']);
  if (mediaType) params.set('media_type', `eq.${mediaType}`);

  const tmdbId = textParam(url.searchParams.get('tmdbId'));
  if (/^\d+$/.test(tmdbId)) params.set('tmdb_id', `eq.${tmdbId}`);

  return `media_clips?${params.toString()}`;
}

function matchesText(clip: MediaClipRow, q: string) {
  if (!q) return true;
  const haystack = [clip.title, clip.description, clip.media_title, ...(clip.genres || [])].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(q.toLowerCase());
}

function matchesGenre(clip: MediaClipRow, genre: string) {
  if (!genre) return true;
  return (clip.genres || []).some((item) => item.toLowerCase() === genre.toLowerCase());
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = numberParam(url.searchParams.get('limit'), 24, 1, 60);
    const offset = numberParam(url.searchParams.get('offset'), 0, 0, 10000);
    const q = textParam(url.searchParams.get('q'));
    const genre = textParam(url.searchParams.get('genre'));
    const fetchLimit = q || genre ? Math.min(Math.max(limit * 4, 60), 120) : limit;
    const rows = await supabaseRest<MediaClipRow[]>(buildPath(url, fetchLimit, offset), {
      mode: 'anon',
      cache: 'no-store',
    });
    const filtered = (rows || []).filter((clip) => matchesText(clip, q) && matchesGenre(clip, genre)).slice(0, limit);
    const id = textParam(url.searchParams.get('id') || url.searchParams.get('clip'));

    return NextResponse.json({
      ok: true,
      clips: filtered,
      clip: id ? filtered[0] || null : undefined,
      hasMore: (rows || []).length >= fetchLimit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot load clips';
    return jsonError(message, 500);
  }
}
