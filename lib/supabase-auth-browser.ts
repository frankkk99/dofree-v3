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
  expires_in?: number;
  token_type?: string;
  user?: DofreeUser;
  profile?: DofreeProfile | null;
};

const sessionKey = 'dodeedee_auth_session';
const defaultRole = 'viewer';
const refreshSkewSeconds = 90;

function baseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '');
}

function anonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function normalizeSession(session: DofreeSession | null | undefined): DofreeSession | null {
  if (!session?.access_token) return null;
  const expiresIn = Number(session.expires_in || 0);
  const expiresAt = Number(session.expires_at || 0) || (expiresIn ? nowSeconds() + expiresIn : undefined);
  return {
    ...session,
    expires_at: expiresAt,
  };
}

function isExpired(session: DofreeSession | null | undefined, skewSeconds = refreshSkewSeconds) {
  const expiresAt = Number(session?.expires_at || 0);
  if (!expiresAt) return false;
  return expiresAt <= nowSeconds() + skewSeconds;
}

function currentOrigin() {
  if (typeof window === 'undefined') return 'https://www.xn--l3caa5kbu.online';
  return window.location.origin.includes('localhost') ? 'https://www.xn--l3caa5kbu.online' : window.location.origin;
}

function authRedirectTo() {
  return `${currentOrigin()}/auth?confirmed=1`;
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

async function loadProfile(userId: string, token: string) {
  const data = await restFetch<DofreeProfile[]>(
    `profiles?id=eq.${encodeURIComponent(userId)}&select=id,display_name,avatar_url,role&limit=1`,
    { method: 'GET' },
    token,
  );
  return Array.isArray(data) ? data[0] || null : null;
}

async function createProfile(user: DofreeUser, token: string) {
  const data = await restFetch<DofreeProfile[]>(
    'profiles',
    {
      method: 'POST',
      body: JSON.stringify({
        id: user.id,
        display_name: profileName(user),
        role: defaultRole,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    },
    token,
  );
  return Array.isArray(data) ? data[0] || null : null;
}

export function getStoredSession(): DofreeSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(sessionKey);
    const session = normalizeSession(raw ? (JSON.parse(raw) as DofreeSession) : null);
    if (!session) return null;
    if (session.expires_at && session.expires_at <= nowSeconds() - 86400) {
      window.localStorage.removeItem(sessionKey);
      return null;
    }
    return session;
  } catch {
    window.localStorage.removeItem(sessionKey);
    return null;
  }
}

export function storeSession(session: DofreeSession | null) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeSession(session);
  if (!normalized) {
    window.localStorage.removeItem(sessionKey);
  } else {
    window.localStorage.setItem(sessionKey, JSON.stringify(normalized));
  }
  window.dispatchEvent(new CustomEvent('dofree-auth-change'));
}

async function refreshSessionTokens(session: DofreeSession) {
  const refreshToken = session.refresh_token;
  if (!refreshToken) return null;
  const refreshed = await authFetch<DofreeSession>('token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const merged: DofreeSession = { ...session, ...refreshed, refresh_token: refreshed.refresh_token || refreshToken };
  if (!refreshed.expires_at && refreshed.expires_in) merged.expires_at = nowSeconds() + Number(refreshed.expires_in);
  return normalizeSession(merged);
}

export async function ensureProfile(session: DofreeSession) {
  let normalized = normalizeSession(session);
  if (!normalized?.access_token) throw new Error('Session expired');
  if (isExpired(normalized)) {
    normalized = await refreshSessionTokens(normalized);
    if (!normalized?.access_token) throw new Error('Session expired');
  }

  const token = normalized.access_token;
  const user = normalized.user || await authFetch<DofreeUser>('user', { method: 'GET' }, token);

  let profile = await loadProfile(user.id, token);
  if (!profile) profile = await createProfile(user, token);

  const nextSession = { ...normalized, user: { ...user, role: profile?.role || user.role || defaultRole }, profile };
  storeSession(nextSession);
  return nextSession;
}

export async function refreshSession(session = getStoredSession()) {
  const current = normalizeSession(session);
  if (!current?.refresh_token) {
    storeSession(null);
    return null;
  }

  try {
    const refreshed = await refreshSessionTokens(current);
    return refreshed ? ensureProfile(refreshed) : null;
  } catch {
    storeSession(null);
    return null;
  }
}

export async function getValidSession() {
  const session = getStoredSession();
  if (!session?.access_token) return null;
  if (isExpired(session)) return refreshSession(session);
  return session;
}

export async function hydrateStoredSession() {
  const session = await getValidSession();
  if (!session?.access_token) return null;
  try {
    return await ensureProfile(session);
  } catch {
    return refreshSession(session);
  }
}

export async function consumeAuthRedirectFromUrl() {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const error = params.get('error') || params.get('error_code');
  if (error) {
    const description = params.get('error_description') || error;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    throw new Error(decodeURIComponent(description.replace(/\+/g, ' ')));
  }

  const accessToken = params.get('access_token');
  if (!accessToken) return null;

  const session: DofreeSession = {
    access_token: accessToken,
    refresh_token: params.get('refresh_token') || undefined,
    expires_in: params.get('expires_in') ? Number(params.get('expires_in')) : undefined,
    expires_at: params.get('expires_at') ? Number(params.get('expires_at')) : undefined,
    token_type: params.get('token_type') || undefined,
  };

  const nextSession = await ensureProfile(session);
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
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
  const redirectTo = encodeURIComponent(authRedirectTo());
  const data = await authFetch<DofreeSession>(`signup?redirect_to=${redirectTo}`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data?.access_token) return ensureProfile(data);
  return data;
}

export async function resendConfirmationEmail(email: string) {
  const redirectTo = encodeURIComponent(authRedirectTo());
  return authFetch(`resend?redirect_to=${redirectTo}`, {
    method: 'POST',
    body: JSON.stringify({ type: 'signup', email }),
  });
}

export async function getCurrentUser() {
  const session = await getValidSession();
  if (!session?.access_token) return null;
  try {
    const user = await authFetch<DofreeUser>('user', { method: 'GET' }, session.access_token);
    await ensureProfile({ ...session, user });
    return user;
  } catch {
    const refreshed = await refreshSession(session);
    return refreshed?.user || null;
  }
}

export async function signOut() {
  const session = getStoredSession();
  if (session?.access_token) {
    await authFetch('logout', { method: 'POST' }, session.access_token).catch(() => null);
  }
  storeSession(null);
}
