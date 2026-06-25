import { NextResponse } from 'next/server';
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

type CountResponse = { count?: number };

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

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
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

async function requireAdmin(token: string) {
  const user = await currentUser(token);
  const profiles = await supabaseRest<ProfileRecord[]>(`profiles?id=eq.${encodeURIComponent(user.id)}&select=id,role&limit=1`);
  const role = profiles?.[0]?.role || 'viewer';
  if (role !== 'admin') throw new Error('Admin only');
  return { user, role };
}

async function count(path: string) {
  const rows = await supabaseRest<CountResponse[]>(path);
  return Number(rows?.[0]?.count || 0);
}

export async function GET(request: Request) {
  try {
    const token = bearer(request);
    if (!token) return jsonError('Login required', 401);
    const admin = await requireAdmin(token);

    const [
      totalCatalog,
      readyLinks,
      missingLinks,
      brokenLinks,
      users,
      favorites,
      watchHistory,
      memberships,
      premiumMembers,
      reports,
      sections,
      categories,
    ] = await Promise.all([
      count('tmdb_catalog?select=count'),
      count('admin_movie_links?watch_url=not.is.null&select=count'),
      count('tmdb_catalog?tmdb_id=not.in.(select.tmdb_id.admin_movie_links)&select=count'),
      count('admin_movie_links?status=eq.broken&select=count'),
      count('profiles?select=count'),
      count('favorites?select=count'),
      count('watch_history?select=count'),
      count('memberships?select=count'),
      count('memberships?status=eq.active&select=count'),
      count('link_reports?select=count'),
      count('admin_sections?select=count'),
      count('admin_categories?select=count'),
    ]);

    const missingSamples = await supabaseRest<Array<{ tmdb_id: number; media_type: string; title?: string | null; poster_url?: string | null; rating?: number | null; year?: string | null }>>(
      'tmdb_catalog?select=tmdb_id,media_type,title,poster_url,rating,year&order=rating.desc&limit=12',
    );

    return NextResponse.json({
      ok: true,
      admin,
      metrics: {
        totalCatalog,
        readyLinks,
        missingLinks,
        brokenLinks,
        users,
        favorites,
        watchHistory,
        memberships,
        premiumMembers,
        reports,
        sections,
        categories,
      },
      tasks: [
        { title: 'เติมลิงก์หนังที่ยังไม่มี', value: missingLinks, tone: 'red' },
        { title: 'ตรวจลิงก์เสีย', value: brokenLinks, tone: 'orange' },
        { title: 'จัดการผู้ใช้และสมาชิก', value: users, tone: 'blue' },
        { title: 'ตรวจรายงานจากผู้ใช้', value: reports, tone: 'purple' },
      ],
      missingSamples: missingSamples || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot load dashboard';
    return jsonError(message, message === 'Admin only' ? 403 : 500);
  }
}
