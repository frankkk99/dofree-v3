import { NextResponse } from 'next/server';
import { supabaseRest } from '@/lib/supabase-rest';

type AuthUser = {
  id: string;
  email?: string;
  phone?: string;
};

type ProfileRecord = {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role?: 'viewer' | 'admin' | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type MembershipRecord = {
  user_id: string;
  plan?: string | null;
  status?: string | null;
  expires_at?: string | null;
};

type OwnedRecord = {
  user_id: string;
};

const allowedRoles = ['viewer', 'admin'] as const;

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

function increment(map: Map<string, number>, key?: string | null) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
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

async function requireAdmin(token: string) {
  const user = await currentUser(token);
  const profiles = await supabaseRest<ProfileRecord[]>(`profiles?id=eq.${encodeURIComponent(user.id)}&select=id,role&limit=1`);
  const role = profiles?.[0]?.role || 'viewer';
  if (role !== 'admin') throw new Error('Admin only');
  return { user, role };
}

export async function GET(request: Request) {
  try {
    const token = bearer(request);
    if (!token) return jsonError('Login required', 401);
    await requireAdmin(token);

    const [profiles, memberships, favorites, history] = await Promise.all([
      supabaseRest<ProfileRecord[]>('profiles?select=id,display_name,avatar_url,role,created_at,updated_at&order=created_at.desc&limit=1000'),
      supabaseRest<MembershipRecord[]>('memberships?select=user_id,plan,status,expires_at&limit=10000'),
      supabaseRest<OwnedRecord[]>('favorites?select=user_id&limit=10000'),
      supabaseRest<OwnedRecord[]>('watch_history?select=user_id&limit=10000'),
    ]);

    const membershipMap = new Map(memberships.map((item) => [item.user_id, item]));
    const favoriteCount = new Map<string, number>();
    const historyCount = new Map<string, number>();

    favorites.forEach((item) => increment(favoriteCount, item.user_id));
    history.forEach((item) => increment(historyCount, item.user_id));

    const users = profiles.map((profile) => ({
      ...profile,
      role: profile.role || 'viewer',
      membership: membershipMap.get(profile.id) || null,
      favorite_count: favoriteCount.get(profile.id) || 0,
      history_count: historyCount.get(profile.id) || 0,
    }));

    const stats = {
      total: users.length,
      admins: users.filter((user) => user.role === 'admin').length,
      viewers: users.filter((user) => user.role !== 'admin').length,
      activePremium: users.filter((user) => user.membership?.status === 'active').length,
    };

    return NextResponse.json({ ok: true, users, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot load users';
    return jsonError(message, message === 'Admin only' ? 403 : 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const token = bearer(request);
    if (!token) return jsonError('Login required', 401);
    const admin = await requireAdmin(token);

    const body = await request.json().catch(() => null) as { userId?: string; role?: string } | null;
    const userId = body?.userId?.trim();
    const role = body?.role?.trim();

    if (!userId || !role) return jsonError('Missing userId or role');
    if (!allowedRoles.includes(role as 'viewer' | 'admin')) return jsonError('Invalid role');
    if (userId === admin.user.id) return jsonError('ไม่อนุญาตให้เปลี่ยน role ของบัญชีตัวเองจากหน้านี้', 403);

    const updated = await supabaseRest<ProfileRecord[]>(
      `profiles?id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        body: { role, updated_at: new Date().toISOString() },
        prefer: 'return=representation',
      },
    );

    return NextResponse.json({ ok: true, user: updated?.[0] || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot update user role';
    return jsonError(message, message === 'Admin only' ? 403 : 500);
  }
}
