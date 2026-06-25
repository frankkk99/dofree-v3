import { NextResponse } from 'next/server';

type WatchHistoryPayload = {
  mediaType?: string;
  mediaId?: number;
  title?: string;
  poster?: string;
  progressSeconds?: number;
  durationSeconds?: number;
};

type AuthUser = {
  id: string;
  email?: string;
  phone?: string;
};

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

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
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

async function supabaseRest(path: string, token: string, init: RequestInit = {}) {
  const url = supabaseUrl();
  const key = anonKey();
  if (!url || !key) throw new Error('Missing Supabase public env');

  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
}

export async function GET(request: Request) {
  try {
    const token = bearer(request);
    if (!token) return jsonError('Login required', 401);

    const user = await currentUser(token);
    const response = await supabaseRest(
      `watch_history?user_id=eq.${encodeURIComponent(user.id)}&select=id,user_id,media_type,media_id,title,poster,progress_seconds,duration_seconds,watched_at&order=watched_at.desc&limit=120`,
      token,
    );

    const data = await response.json().catch(() => []);
    if (!response.ok) return jsonError(data?.message || 'Cannot load watch history', response.status);

    return NextResponse.json({ ok: true, items: data });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Cannot load watch history', 500);
  }
}

export async function POST(request: Request) {
  try {
    const token = bearer(request);
    if (!token) return jsonError('Login required', 401);

    const user = await currentUser(token);
    const payload = (await request.json()) as WatchHistoryPayload;
    const mediaType = payload.mediaType?.trim();
    const mediaId = Number(payload.mediaId || 0);
    const title = payload.title?.trim();

    if (!mediaType || !mediaId || !title) return jsonError('Missing watch history data');

    const body = {
      user_id: user.id,
      media_type: mediaType,
      media_id: mediaId,
      title,
      poster: payload.poster || null,
      progress_seconds: Number(payload.progressSeconds || 0),
      duration_seconds: payload.durationSeconds ? Number(payload.durationSeconds) : null,
      watched_at: new Date().toISOString(),
    };

    const response = await supabaseRest(
      'watch_history?on_conflict=user_id,media_type,media_id',
      token,
      {
        method: 'POST',
        headers: {
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(body),
      },
    );

    const data = await response.json().catch(() => null);
    if (!response.ok) return jsonError(data?.message || 'Cannot save watch history', response.status);

    return NextResponse.json({ ok: true, item: Array.isArray(data) ? data[0] : data });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Cannot save watch history', 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const token = bearer(request);
    if (!token) return jsonError('Login required', 401);

    const user = await currentUser(token);
    const url = new URL(request.url);
    const mediaType = url.searchParams.get('mediaType') || '';
    const mediaId = Number(url.searchParams.get('mediaId') || 0);

    if (!mediaType || !mediaId) return jsonError('Missing watch history key');

    const response = await supabaseRest(
      `watch_history?user_id=eq.${encodeURIComponent(user.id)}&media_type=eq.${encodeURIComponent(mediaType)}&media_id=eq.${mediaId}`,
      token,
      {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      return jsonError(data?.message || 'Cannot remove watch history', response.status);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Cannot remove watch history', 500);
  }
}
