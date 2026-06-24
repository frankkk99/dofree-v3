import { NextResponse } from 'next/server';
import { supabaseRest } from '@/lib/supabase-rest';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type SyncState = {
  id: string;
  cursor_value: number;
};

type SyncResult = {
  ok?: boolean;
  nextCursor?: number;
  totalTasks?: number;
  done?: boolean;
  upserted?: number;
  skipped?: number;
  error?: string;
};

function bearerToken(request: Request) {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return bearerToken(request) === secret || request.headers.get('x-cron-secret')?.trim() === secret;
}

async function readCursor() {
  const rows = await supabaseRest<SyncState[]>('cron_sync_state?select=id,cursor_value&id=eq.tmdb-catalog&limit=1', { mode: 'service' });
  return Math.max(0, Number(rows?.[0]?.cursor_value || 0));
}

async function writeCursor(cursor: number, result: SyncResult) {
  await supabaseRest('cron_sync_state?id=eq.tmdb-catalog', {
    method: 'PATCH',
    mode: 'service',
    body: {
      cursor_value: cursor,
      last_run_at: new Date().toISOString(),
      last_success_at: result.ok ? new Date().toISOString() : null,
      last_result: result,
      updated_at: new Date().toISOString(),
    },
  });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized cron request' }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const adminToken = process.env.DOFREE_ADMIN_TOKEN?.trim();
  if (!adminToken) {
    return NextResponse.json({ ok: false, error: 'Missing DOFREE_ADMIN_TOKEN' }, { status: 500 });
  }

  const cursor = await readCursor();
  const pagesPerRun = Number(process.env.TMDB_CRON_PAGES_PER_RUN || 20);
  const targetLimit = Number(process.env.TMDB_CRON_TARGET_LIMIT || 10000);

  const response = await fetch(`${origin}/api/admin/tmdb-catalog-sync`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-admin-token': adminToken,
    },
    body: JSON.stringify({ cursor, pagesPerRun, targetLimit }),
    cache: 'no-store',
  });

  const result = (await response.json().catch(() => ({ ok: false, error: 'Empty sync response' }))) as SyncResult;
  const nextCursor = result.done ? 0 : Math.max(0, Number(result.nextCursor || cursor));
  await writeCursor(nextCursor, result);

  return NextResponse.json({
    ok: response.ok && result.ok,
    cron: true,
    cursor,
    nextCursor,
    result,
  }, { status: response.ok ? 200 : response.status });
}
