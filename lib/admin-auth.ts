import { supabaseRest } from './supabase-rest';

type AuthUser = {
  id: string;
  email?: string;
  phone?: string;
};

type ProfileRecord = {
  id: string;
  role?: string | null;
  display_name?: string | null;
};

export type AdminActor = {
  id: string;
  label: string;
  role: 'admin' | 'super_admin' | 'token_admin';
};

function normalizeAdminToken(value?: string | null) {
  return value?.trim().replace(/^DOFREE_ADMIN_TOKEN\s*=\s*/i, '').trim();
}

function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '');
}

function anonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
}

function bearerToken(request: Request) {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
}

function actorLabel(user: AuthUser, profile?: ProfileRecord | null) {
  return profile?.display_name || user.email || user.phone || `user-${user.id.slice(0, 8)}`;
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

export function requireAdminToken(request: Request) {
  const configuredToken = normalizeAdminToken(process.env.DOFREE_ADMIN_TOKEN);

  if (!configuredToken) {
    return {
      ok: false as const,
      status: 500,
      error: 'Missing DOFREE_ADMIN_TOKEN. Add it in Vercel Environment Variables before using admin writes.',
    };
  }

  const suppliedToken = normalizeAdminToken(request.headers.get('x-admin-token') || bearerToken(request));

  if (suppliedToken !== configuredToken) {
    return {
      ok: false as const,
      status: 401,
      error: 'Invalid admin token',
    };
  }

  return { ok: true as const };
}

export async function requireAdminAccess(request: Request) {
  const configuredToken = normalizeAdminToken(process.env.DOFREE_ADMIN_TOKEN);
  const suppliedToken = normalizeAdminToken(request.headers.get('x-admin-token') || bearerToken(request));

  if (configuredToken && suppliedToken === configuredToken) {
    return {
      ok: true as const,
      actor: {
        id: 'admin-token',
        label: 'Admin Token',
        role: 'token_admin' as const,
      },
    };
  }

  const sessionToken = bearerToken(request);
  if (!sessionToken) {
    return {
      ok: false as const,
      status: 401,
      error: configuredToken ? 'Login as admin or provide Admin Token' : 'Login as admin',
    };
  }

  try {
    const user = await currentUser(sessionToken);
    const profiles = await supabaseRest<ProfileRecord[]>(`profiles?id=eq.${encodeURIComponent(user.id)}&select=id,display_name,role&limit=1`);
    const profile = profiles?.[0] || null;
    const role = profile?.role || 'viewer';

    if (role !== 'admin' && role !== 'super_admin') {
      return { ok: false as const, status: 403, error: 'Admin only' };
    }

    return {
      ok: true as const,
      actor: {
        id: user.id,
        label: actorLabel(user, profile),
        role,
      },
    };
  } catch (error) {
    return {
      ok: false as const,
      status: 401,
      error: error instanceof Error ? error.message : 'Unauthorized',
    };
  }
}
