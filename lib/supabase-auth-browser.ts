export type DofreeUser = {
  id: string;
  email?: string;
  phone?: string;
  role?: string;
};

export type DofreeSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user?: DofreeUser;
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

export async function signInWithEmail(email: string, password: string) {
  const data = await authFetch<DofreeSession>('token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  storeSession(data);
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const data = await authFetch<DofreeSession>('signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data?.access_token) storeSession(data);
  return data;
}

export async function getCurrentUser() {
  const session = getStoredSession();
  if (!session?.access_token) return null;
  const user = await authFetch<DofreeUser>('user', { method: 'GET' }, session.access_token);
  storeSession({ ...session, user });
  return user;
}

export async function signOut() {
  const session = getStoredSession();
  if (session?.access_token) {
    await authFetch('logout', { method: 'POST' }, session.access_token).catch(() => null);
  }
  storeSession(null);
}
