import { createHmac, timingSafeEqual } from 'crypto';

type WatchSourcePayload = {
  url: string;
  mediaType: string;
  id: number;
  exp: number;
};

function secret() {
  return (
    process.env.DOFREE_WATCH_TOKEN_SECRET ||
    process.env.DOFREE_ADMIN_TOKEN ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  ).trim();
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function signPayload(encodedPayload: string) {
  const key = secret();
  if (!key) throw new Error('Missing DOFREE_WATCH_TOKEN_SECRET');
  return createHmac('sha256', key).update(encodedPayload).digest('base64url');
}

export function createWatchSourceToken(payload: Omit<WatchSourcePayload, 'exp'>, ttlSeconds = 180) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const encodedPayload = base64url(JSON.stringify({ ...payload, exp }));
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifyWatchSourceToken(token?: string | null): WatchSourcePayload | null {
  if (!token || !token.includes('.')) return null;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  let expected = '';
  try {
    expected = signPayload(encodedPayload);
  } catch {
    return null;
  }

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as WatchSourcePayload;
    if (!payload.url || !payload.mediaType || !payload.id || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
