import { NextResponse } from 'next/server';

type AuthUser = {
  id: string;
  email?: string;
  phone?: string;
};

type ProfileRecord = {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
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
      `profiles?id=eq.${encodeURIComponent(user.id)}&select=id,display_name,avatar_url,role&limit=1`,
      token,
    );

    const data = (await response.json().catch(() => [])) as ProfileRecord[];
    if (!response.ok) return jsonError('Cannot load profile', response.status);

    const profile = data[0] || null;
    const role = profile?.role || 'viewer';
    const isAdmin = role === 'admin' || role === 'super_admin';

    return NextResponse.json({
      ok: true,
      user,
      profile,
      role,
      isAdmin,
      isPremium: role === 'premium' || isAdmin,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Cannot load profile', 500);
  }
}
