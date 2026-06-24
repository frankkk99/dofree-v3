export type DofreeRole = 'admin' | 'user';

export type DofreeAccountSeed = {
  username: string;
  role: DofreeRole;
  displayName: string;
};

export type DofreeProfile = {
  auth_user_id: string;
  username: string;
  role: DofreeRole;
  display_name?: string | null;
};

export const DOFREE_AUTH_EMAIL_DOMAIN = 'dofree.local';

export const defaultDofreeAccounts: DofreeAccountSeed[] = [
  { username: 'admin1', role: 'admin', displayName: 'Admin 1' },
  { username: 'user1', role: 'user', displayName: 'User 1' },
  { username: 'user2', role: 'user', displayName: 'User 2' },
  { username: 'user3', role: 'user', displayName: 'User 3' },
];

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

export function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@${DOFREE_AUTH_EMAIL_DOMAIN}`;
}

export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) return null;
  return { url, key };
}

export function getSupabaseServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) return null;
  return { url, serviceKey };
}

export function createOneTimeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const randomValues = new Uint8Array(18);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (value) => alphabet[value % alphabet.length]).join('');
}
