import { NextResponse } from 'next/server';
import { getAdminRoleLabel, isAdminRole } from '@/lib/admin-access-control';
import { supabaseRest as supabaseServiceRest } from '@/lib/supabase-rest';

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

type MembershipRecord = {
  user_id: string;
  plan?: string | null;
  status?: string | null;
  expires_at?: string | null;
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

function profileName(user: AuthUser) {
  return user.email?.split('@')[0] || user.phone || `user-${user.id.slice(0, 8)}`;
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

async function loadProfile(user: AuthUser) {
  const rows = await supabaseServiceRest<ProfileRecord[]>(
    `profiles?id=eq.${encodeURIComponent(user.id)}&select=id,display_name,avatar_url,role&limit=1`,
    { mode: 'service', cache: 'no-store' },
  ).catch(() => []);

  if (rows?.[0]) return rows[0];

  const created = await supabaseServiceRest<ProfileRecord[]>(
    'profiles',
    {
      mode: 'service',
      method: 'POST',
      prefer: 'return=representation',
      body: {
        id: user.id,
        display_name: profileName(user),
        role: 'viewer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      cache: 'no-store',
    },
  ).catch(() => []);

  return created?.[0] || null;
}

function membershipIsActive(membership?: MembershipRecord | null) {
  if (!membership) return false;
  if (membership.plan !== 'premium' || membership.status !== 'active') return false;
  if (!membership.expires_at) return true;
  const expiresAt = new Date(membership.expires_at).getTime();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export async function GET(request: Request) {
  try {
    const token = bearer(request);
    if (!token) return jsonError('Login required', 401);

    const user = await currentUser(token);
    const profile = await loadProfile(user);
    const role = profile?.role || 'viewer';
    const isAdmin = isAdminRole(role);
    const membership = await supabaseServiceRest<MembershipRecord[]>(
      `memberships?user_id=eq.${encodeURIComponent(user.id)}&select=user_id,plan,status,expires_at&limit=1`,
      { mode: 'service', cache: 'no-store' },
    ).then((rows) => rows?.[0] || null).catch(() => null);
    const isPremium = role === 'premium' || membershipIsActive(membership) || isAdmin;

    return NextResponse.json({
      ok: true,
      user,
      profile,
      membership,
      role,
      roleLabel: getAdminRoleLabel(role),
      isAdmin,
      isPremium,
      hasPremiumAccess: isPremium,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot load profile';
    return jsonError(message, message === 'Unauthorized' ? 401 : 500);
  }
}
