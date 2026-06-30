import { createHash, timingSafeEqual } from 'node:crypto';
import { isAdminRole, isOwnerRole } from '@/lib/admin-access-control';

function normalizeAdminToken(value?: string | null) {
  return value?.trim().replace(/^DOFREE_ADMIN_TOKEN\s*=\s*/i, '').trim();
}

function safeTokenEqual(a?: string | null, b?: string | null) {
  const left = normalizeAdminToken(a);
  const right = normalizeAdminToken(b);
  if (!left || !right) return false;

  const leftDigest = createHash('sha256').update(left).digest();
  const rightDigest = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

type AuthUser = {
  id: string;
  email?: string;
  phone?: string;
};

type ProfileRecord = {
  id: string;
  role?: string | null;
};

export type AdminAccess =
  | { ok: true; mode: 'session' | 'token'; user?: AuthUser; role?: string }
  | { ok: false; status: number; error: string };

function bearerToken(request: Request) {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
}

function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
}

function anonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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

async function profileRole(token: string, userId: string) {
  const url = supabaseUrl();
  const key = anonKey();
  if (!url || !key) throw new Error('Missing Supabase public env');

  const response = await fetch(
    `${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,role&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    },
  );

  if (!response.ok) throw new Error('Cannot load profile');
  const rows = (await response.json().catch((): ProfileRecord[] => [])) as ProfileRecord[];
  return rows[0]?.role || 'viewer';
}

export function requireAdminToken(request: Request) {
  const configuredToken = normalizeAdminToken(process.env.DOFREE_ADMIN_TOKEN);

  if (!configuredToken) {
    return {
      ok: false as const,
      status: 500,
      error: 'Missing DOFREE_ADMIN_TOKEN. Add it in Vercel Environment Variables before using admin writes.',
    };
  }

  const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const headerToken = request.headers.get('x-admin-token')?.trim();
  const suppliedToken = normalizeAdminToken(headerToken || bearerToken);

  if (!safeTokenEqual(suppliedToken, configuredToken)) {
    return {
      ok: false as const,
      status: 401,
      error: 'Invalid admin token',
    };
  }

  return { ok: true as const };
}

export async function requireAdminAccess(request: Request): Promise<AdminAccess> {
  const configuredToken = normalizeAdminToken(process.env.DOFREE_ADMIN_TOKEN);
  const suppliedHeaderToken = normalizeAdminToken(request.headers.get('x-admin-token'));
  const suppliedBearer = bearerToken(request);
  const suppliedBearerAsAdminToken = normalizeAdminToken(suppliedBearer);

  if (configuredToken && (safeTokenEqual(suppliedHeaderToken, configuredToken) || safeTokenEqual(suppliedBearerAsAdminToken, configuredToken))) {
    return { ok: true, mode: 'token' };
  }

  if (suppliedBearer) {
    try {
      const user = await currentUser(suppliedBearer);
      const role = await profileRole(suppliedBearer, user.id);
      if (isAdminRole(role)) return { ok: true, mode: 'session', user, role };
      return { ok: false, status: 403, error: 'Admin only' };
    } catch (error) {
      return { ok: false, status: 401, error: error instanceof Error ? error.message : 'Unauthorized' };
    }
  }

  if (suppliedHeaderToken) {
    return {
      ok: false,
      status: configuredToken ? 401 : 500,
      error: configuredToken ? 'Invalid admin token' : 'Missing DOFREE_ADMIN_TOKEN',
    };
  }

  return { ok: false, status: 401, error: 'Admin session required' };
}

export async function requireOwnerAccess(request: Request): Promise<AdminAccess> {
  const access = await requireAdminAccess(request);
  if (!access.ok) return access;
  if (access.mode !== 'session' || !isOwnerRole(access.role)) {
    return { ok: false, status: 403, error: 'FORBIDDEN' };
  }
  return access;
}
