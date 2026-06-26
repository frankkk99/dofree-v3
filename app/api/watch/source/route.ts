import { NextResponse } from 'next/server';
import { verifyWatchSourceToken } from '@/lib/watch-source-token';

export const dynamic = 'force-dynamic';

function securityHeaders(response: NextResponse) {
  response.headers.set('cache-control', 'no-store, max-age=0');
  response.headers.set('referrer-policy', 'no-referrer');
  response.headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
  return response;
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  const payload = verifyWatchSourceToken(token);

  if (!payload) {
    return securityHeaders(NextResponse.json({ error: 'Invalid or expired watch source' }, { status: 401 }));
  }

  return securityHeaders(NextResponse.redirect(payload.url, 307));
}
