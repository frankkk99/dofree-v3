import { NextResponse } from 'next/server';
import { isAdminRole } from '@/lib/admin-access-control';
import { supabaseRest } from '@/lib/supabase-rest';

type AuthUser = {
  id: string;
  email?: string;
  phone?: string;
};

type ProfileRecord = {
  id: string;
  role?: string | null;
};

type SiteFeatureRow = {
  feature_key: string;
  is_enabled: boolean;
};

const HOME_CLIPS_KEY = 'home_clips_section';
const defaultSettings = { homeClipsEnabled: true };

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
}

function anonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function bearer(request: Request) {
  const header = request.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  return token || null;
}

async function currentUser(token: string) {
  const url = supabaseUrl();
  const key = anonKey();
  if (!url || !key) throw new Error('Missing Supabase public env');

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error('Unauthorized');
  return (await response.json()) as AuthUser;
}

async function requireAdmin(request: Request) {
  const token = bearer(request);
  if (!token) return { error: jsonError('Login required', 401) };

  const user = await currentUser(token);
  const rows = await supabaseRest<ProfileRecord[]>(
    `profiles?id=eq.${encodeURIComponent(user.id)}&select=id,role&limit=1`,
    { mode: 'service', cache: 'no-store' },
  );
  const role = rows?.[0]?.role || 'viewer';
  if (!isAdminRole(role)) return { error: jsonError('Admin permission required', 403) };

  return { user, role };
}

async function readHomeClipsSetting() {
  const rows = await supabaseRest<SiteFeatureRow[]>(
    `site_feature_settings?feature_key=eq.${encodeURIComponent(HOME_CLIPS_KEY)}&select=feature_key,is_enabled&limit=1`,
    { mode: 'service', cache: 'no-store' },
  );
  return rows?.[0]?.is_enabled ?? true;
}

async function writeHomeClipsSetting(isEnabled: boolean) {
  const rows = await supabaseRest<SiteFeatureRow[]>(
    'site_feature_settings?on_conflict=feature_key',
    {
      mode: 'service',
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      cache: 'no-store',
      body: {
        feature_key: HOME_CLIPS_KEY,
        is_enabled: isEnabled,
        updated_at: new Date().toISOString(),
      },
    },
  );
  return rows?.[0]?.is_enabled ?? isEnabled;
}

export async function GET() {
  try {
    const homeClipsEnabled = await readHomeClipsSetting();
    return NextResponse.json({ ok: true, settings: { homeClipsEnabled } });
  } catch {
    return NextResponse.json({ ok: true, settings: defaultSettings });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const input = await request.json().catch(() => ({})) as { homeClipsEnabled?: unknown };
    if (typeof input.homeClipsEnabled !== 'boolean') return jsonError('homeClipsEnabled must be boolean', 400);

    const homeClipsEnabled = await writeHomeClipsSetting(input.homeClipsEnabled);
    return NextResponse.json({ ok: true, settings: { homeClipsEnabled } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot update site features';
    return jsonError(message, message === 'Unauthorized' ? 401 : 400);
  }
}
