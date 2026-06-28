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
  membership_tier?: 'free' | 'premium' | null;
  membership_status?: 'active' | 'expired' | 'canceled' | 'trialing' | null;
  premium_until?: string | null;
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
const defaultMembership = {
  membership_tier: 'free',
  membership_status: 'active',
  premium_until: null,
} satisfies Pick<DofreeProfile, 'membership_tier' | 'membership_status' | 'premium_until'>;

function baseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '');
}

function anonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
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

function withMembershipDefaults(profile: DofreeProfile | null) {
  return profile ? { ...defaultMembership, ...profile } : null;
}

async function loadProfile(userId: string, token: string) {
  try {
    const data = await restFetch<DofreeProfile[]>(
      `profiles?id=eq.${encodeURIComponent(userId)}&select=id,display_name,avatar_url,role,membership_tier,membership_status,premium_until&limit=1`,
      { method: 'GET' },
      token,
    );
    return withMembershipDefaults(Array.isArray(data) ? data[0] || null : null);
  } catch {
    const data = await restFetch<DofreeProfile[]>(
      `profiles?id=eq.${encodeURIComponent(userId)}&select=id,display_name,avatar_url,role&limit=1`,
      { method: 'GET' },
      token,
    );
    return withMembershipDefaults(Array.isArray(data) ? data[0] || null : null);
  }
}

async function createProfile(user: DofreeUser, token: string) {
  const now = new Date().toISOString();
  const baseProfile = {
    id: user.id,
    display_name: profileName(user),
    role: defaultRole,
    created_at: now,
    updated_at: now,
  };

  try {
    const data = await restFetch<DofreeProfile[]>(
      'profiles',
      {
        method: 'POST',
        body: JSON.stringify({ ...baseProfile, ...defaultMembership }),
      },
      token,
    );
    return withMembershipDefaults(Array.isArray(data) ? data[0] || null : null);
  } catch {
    const data = await restFetch<DofreeProfile[]>(
      'profiles',
      {
        method: 'POST',
        body: JSON.stringify(baseProfile),
      },
      token,
    );
    return withMembershipDefaults(Array.isArray(data) ? data[0] || null : null);
  }
}

export function roleIsAdmin(role?: string | null) {
  return role === 'admin' || role === 'super_admin';
}

export function isPremiumProfile(profile?: DofreeProfile | null) {
  return profile?.membership_tier === 'premium' && (profile.membership_status === 'active' || profile.membership_status === 'trialing');
}

export function hasPremiumAccess(profile?: DofreeProfile | null, role?: string | null) {
  return roleIsAdmin(role || profile?.role) || isPremiumProfile(profile);
}

export function sessionMembershipState(session?: DofreeSession | null) {
  const profile = withMembershipDefaults(session?.profile || null);
  const role = profile?.role || session?.user?.role || defaultRole;
  const isSignedIn = Boolean(session?.access_token && session?.user?.id);
  const isAdmin = isSignedIn && roleIsAdmin(role);
  const isPremium = isSignedIn && isPremiumProfile(profile);
  return {
    isSignedIn,
    isAdmin,
    membershipTier: profile?.membership_tier || 'free',
    membershipStatus: profile?.membership_status || 'active',
    premiumUntil: profile?.premium_until || null,
    isPremium,
    hasPremiumAccess: isAdmin || isPremium,
  };
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

  let profile = await loadProfile(user.id, token);
  if (!profile) profile = await createProfile(user, token);

  const normalizedProfile = withMembershipDefaults(profile);
  const nextSession = { ...session, user: { ...user, role: normalizedProfile?.role || user.role || defaultRole }, profile: normalizedProfile };
  storeSession(nextSession);
  return nextSession;
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
