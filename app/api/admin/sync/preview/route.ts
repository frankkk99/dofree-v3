import { NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin-auth';
import { createPreview } from '@/lib/admin-sync-center';

export const dynamic = 'force-dynamic';

async function readBody(request: Request) {
  const text = await request.text().catch(() => '');
  if (!text.trim()) return {};
  return JSON.parse(text) as { profileId?: string; filters?: Record<string, unknown>; safety?: Record<string, unknown> };
}

export async function POST(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === false) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const body = await readBody(request);
    const preview = await createPreview(body.profileId || 'popular-movies', body.filters || {}, body.safety || {});
    return NextResponse.json({ ok: true, preview });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot preview sync' }, { status: 500 });
  }
}
