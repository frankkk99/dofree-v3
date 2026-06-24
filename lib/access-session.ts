import crypto from 'crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

export type AccessRole = 'admin' | 'user';

export type AccessUser = {
  username: string;
  role: AccessRole;
  displayName: string;
};

type StoredAccessUser = AccessUser & {
  codeHash: string;
};

type AccessSession = AccessUser & {
  expiresAt: number;
};

const COOKIE_NAME = 'dofree_access';
const SESSION_DAYS = 60;
const HASH_SALT = 'dofree-v3-local-auth-v1';

const defaultUsers: StoredAccessUser[] = [
  { username: 'admin1', role: 'admin', displayName: 'Admin 1', codeHash: 'bbdb1281e12a1deaaaa30c36b4c9bac55e4a655d7de45d157a2d07038fada418' },
  { username: 'user1', role: 'user', displayName: 'User 1', codeHash: 'a46f46fc2ada0855e10a0689df37772c5c7c586ece12f8248d87bff36e7c93c5' },
  { username: 'user2', role: 'user', displayName: 'User 2', codeHash: '7672bb009bd6a71169dfe4151a73df6f0ece83032c5813eb2c7666e005e162aa' },
  { username: 'user3', role: 'user', displayName: 'User 3', codeHash: '3f8e7df2075b584a2a58d5d4099683f25260670cfdc7184d1c55ea600791b31b' },
];

function signingKey() {
  return process.env.DOFREE_AUTH_KEY || process.env.DOFREE_ADMIN_TOKEN || 'dofree-v3-change-this-key';
}

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function signature(payload: string) {
  return crypto.createHmac('sha256', signingKey()).update(payload).digest('base64url');
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function makeCodeHash(username: string, code: string) {
  return crypto.createHash('sha256').update(`${username}:${code}:${HASH_SALT}`).digest('hex');
}

function configuredUsers() {
  const raw = process.env.DOFREE_ACCESS_USERS_JSON;
  if (!raw) return defaultUsers;

  try {
    const parsed = JSON.parse(raw) as StoredAccessUser[];
    const validUsers = parsed.filter((user) => user.username && user.role && user.displayName && user.codeHash);
    return validUsers.length ? validUsers : defaultUsers;
  } catch {
    return defaultUsers;
  }
}

export async function verifyAccess(username: string, code: string): Promise<AccessUser | null> {
  const normalizedUsername = username.trim().toLowerCase();
  const user = configuredUsers().find((item) => item.username.toLowerCase() === normalizedUsername);
  if (!user) return null;

  const candidate = makeCodeHash(user.username, code);
  if (!safeEqual(candidate, user.codeHash)) return null;

  return {
    username: user.username,
    role: user.role,
    displayName: user.displayName,
  };
}

export function createAccessToken(user: AccessUser) {
  const session: AccessSession = {
    ...user,
    expiresAt: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
  const payload = toBase64Url(JSON.stringify(session));
  return `${payload}.${signature(payload)}`;
}

export function parseAccessToken(token?: string | null): AccessUser | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  if (!safeEqual(sig, signature(payload))) return null;

  try {
    const session = JSON.parse(fromBase64Url(payload)) as AccessSession;
    if (!session.username || !session.role || !session.displayName || !session.expiresAt) return null;
    if (session.expiresAt < Date.now()) return null;
    return {
      username: session.username,
      role: session.role,
      displayName: session.displayName,
    };
  } catch {
    return null;
  }
}

export async function readAccessSession() {
  const cookieStore = await cookies();
  return parseAccessToken(cookieStore.get(COOKIE_NAME)?.value);
}

export function setAccessCookie(response: NextResponse, user: AccessUser) {
  response.cookies.set(COOKIE_NAME, createAccessToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearAccessCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
