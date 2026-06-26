import { NextResponse } from 'next/server';
import { recordAdminAuditLog } from '@/lib/admin-audit';
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
  role?: string | null;
  created_at?: string | null;
};

type MembershipRecord = {
  id?: string;
  user_id: string;
  plan?: string | null;
  status?: string | null;
  slip_url?: string | null;
  started_at?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const allowedPlans = ['free', 'premium'] as const;
const allowedStatuses = ['inactive', 'pending', 'active', 'expired'] as const;

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

async function requireAdmin(token: string) {
  const user = await currentUser(token);
  const profiles = await supabaseRest<ProfileRecord[]>(`profiles?id=eq.${encodeURIComponent(user.id)}&select=id,role&limit=1`);
  const role = profiles?.[0]?.role || 'viewer';
  if (role !== 'admin') throw new Error('Admin only');
  return { user, role };
}

function normalizeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function defaultExpiry(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export async function GET(request: Request) {
  try {
    const token = bearer(request);
    if (!token) return jsonError('Login required', 401);
    await requireAdmin(token);

    const [profiles, memberships] = await Promise.all([
      supabaseRest<ProfileRecord[]>('profiles?select=id,display_name,avatar_url,role,created_at&order=created_at.desc&limit=1000'),
      supabaseRest<MembershipRecord[]>('memberships?select=id,user_id,plan,status,slip_url,started_at,expires_at,created_at,updated_at&limit=10000'),
    ]);

    const membershipMap = new Map(memberships.map((item) => [item.user_id, item]));
    const users = profiles.map((profile) => ({
      ...profile,
      membership: membershipMap.get(profile.id) || null,
    }));

    const stats = {
      totalUsers: users.length,
      membershipRows: memberships.length,
      active: memberships.filter((item) => item.status === 'active').length,
      pending: memberships.filter((item) => item.status === 'pending').length,
      expired: memberships.filter((item) => item.status === 'expired').length,
      inactive: users.length - memberships.filter((item) => item.status && item.status !== 'inactive').length,
    };

    return NextResponse.json({ ok: true, users, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot load memberships';
    return jsonError(message, message === 'Admin only' ? 403 : 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const token = bearer(request);
    if (!token) return jsonError('Login required', 401);
    const admin = await requireAdmin(token);

    const body = await request.json().catch(() => null) as {
      userId?: string;
      plan?: string;
      status?: string;
      expiresAt?: string | null;
      slipUrl?: string | null;
      durationDays?: number | null;
    } | null;

    const userId = body?.userId?.trim();
    const plan = body?.plan?.trim() || 'free';
    const status = body?.status?.trim() || 'inactive';

    if (!userId) return jsonError('Missing userId');
    if (!allowedPlans.includes(plan as 'free' | 'premium')) return jsonError('Invalid plan');
    if (!allowedStatuses.includes(status as 'inactive' | 'pending' | 'active' | 'expired')) return jsonError('Invalid status');

    const expiresAt = normalizeDate(body?.expiresAt) || (status === 'active' ? defaultExpiry(Number(body?.durationDays || 30)) : null);
    const startedAt = status === 'active' ? new Date().toISOString() : null;

    const before = await supabaseRest<MembershipRecord[]>(
      `memberships?user_id=eq.${encodeURIComponent(userId)}&select=id,user_id,plan,status,slip_url,started_at,expires_at,created_at,updated_at&limit=1`,
    ).then((rows) => rows[0] || null).catch(() => null);

    const updated = await supabaseRest<MembershipRecord[]>(
      'memberships?on_conflict=user_id',
      {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=representation',
        body: {
          user_id: userId,
          plan,
          status,
          slip_url: body?.slipUrl || null,
          started_at: startedAt,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
      },
    );

    await recordAdminAuditLog({
      request,
      actor: { ok: true, mode: 'session', user: admin.user, role: admin.role },
      action: 'membership.update',
      entityType: 'memberships',
      entityId: userId,
      beforeData: before,
      afterData: updated?.[0] || { user_id: userId, plan, status, expires_at: expiresAt },
    });

    return NextResponse.json({ ok: true, membership: updated?.[0] || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot update membership';
    return jsonError(message, message === 'Admin only' ? 403 : 500);
  }
}
