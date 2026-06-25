export type DofreeUser = {
  id: string;
  email?: string;
  phone?: string;
  role?: string;
};

export type DofreeProfile = {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

export type DofreeSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user?: DofreeUser;
  profile?: DofreeProfile | null;
};

const sessionKey = 'dofree_auth_session';

function baseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '');
}

function anonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
}

function authHeaders(token?: string) {
  const key = anonKey();
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return {
    apikey: key,
    Authorization: `Bearer ${token || key}`,
    'Content-Type': 'application/json',
  };
}

async function authFetch<T>(path: string, options: RequestInit = {}, token?: string) {
  const url = baseUrl();
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');

  const response = await fetch(`${url}/auth/v1/${path}`, {
    ...options,
    headers: {
      ...authHeaders(token),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.msg || data?.message || data?.error_description || data?.error || 'Auth request failed';
    throw new Error(message);
  }

  return data as T;
}

async function restFetch<T>(path: string, options: RequestInit = {}, token: string) {
  const url = baseUrl();
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...authHeaders(token),
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.msg || data?.message || data?.details || data?.error || 'Database request failed';
    throw new Error(message);
  }

  return data as T;
}

function profileName(user: DofreeUser) {
  return user.email?.split('@')[0] || user.phone || `user-${user.id.slice(0, 8)}`;
}

export function getStoredSession(): DofreeSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(sessionKey);
    return raw ? (JSON.parse(raw) as DofreeSession) : null;
  } catch {
    return null;
  }
}

export function storeSession(session: DofreeSession | null) {
  if (typeof window === 'undefined') return;
  if (!session?.access_token) {
    window.localStorage.removeItem(sessionKey);
  } else {
    window.localStorage.setItem(sessionKey, JSON.stringify(session));
  }
  window.dispatchEvent(new CustomEvent('dofree-auth-change'));
}

export async function ensureProfile(session: DofreeSession) {
  const token = session.access_token;
  const user = session.user || await authFetch<DofreeUser>('user', { method: 'GET' }, token);

  const data = await restFetch<DofreeProfile[]>(
    'profiles?on_conflict=id',
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        id: user.id,
        display_name: profileName(user),
        role: 'user',
        updated_at: new Date().toISOString(),
      }),
    },
    token,
  );

  const profile = Array.isArray(data) ? data[0] : null;
  const nextSession = { ...session, user: { ...user, role: profile?.role || user.role }, profile };
  storeSession(nextSession);
  return nextSession;
}

export async function signInWithEmail(email: string, password: string) {
  const data = await authFetch<DofreeSession>('token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const session = await ensureProfile(data);
  return session;
}

export async function signUpWithEmail(email: string, password: string) {
  const data = await authFetch<DofreeSession>('signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data?.access_token) return ensureProfile(data);
  return data;
}

export async function getCurrentUser() {
  const session = getStoredSession();
  if (!session?.access_token) return null;
  const user = await authFetch<DofreeUser>('user', { method: 'GET' }, session.access_token);
  await ensureProfile({ ...session, user });
  return user;
}

export async function signOut() {
  const session = getStoredSession();
  if (session?.access_token) {
    await authFetch('logout', { method: 'POST' }, session.access_token).catch(() => null);
  }
  storeSession(null);
}
