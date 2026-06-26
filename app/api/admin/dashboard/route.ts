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

type AnalyticsEvent = {
  event_name: string;
  page_path?: string | null;
  media_type?: 'movie' | 'tv' | null;
  media_id?: number | null;
  title?: string | null;
  search_query?: string | null;
  visitor_id?: string | null;
  user_id?: string | null;
  device?: string | null;
  created_at: string;
};

type DailyTraffic = {
  date: string;
  pageViews: number;
  visitors: number;
  watchClicks: number;
};

type RankedItem = {
  label: string;
  value: number;
  mediaType?: 'movie' | 'tv';
  mediaId?: number;
};

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

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function isoDaysAgo(days: number) {
  return daysAgo(days).toISOString();
}

function dayKey(value: string | Date) {
  return (value instanceof Date ? value.toISOString() : value).slice(0, 10);
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
  if (role !== 'admin' && role !== 'super_admin') throw new Error('Admin only');
  return { user, role };
}

async function countRows(path: string) {
  try {
    const rows = await supabaseRest<unknown[]>(path, { cache: 'no-store' });
    return Array.isArray(rows) ? rows.length : 0;
  } catch {
    return 0;
  }
}

async function getRows<T>(path: string) {
  try {
    return await supabaseRest<T[]>(path, { cache: 'no-store' });
  } catch {
    return [];
  }
}

function uniqueVisitors(events: AnalyticsEvent[]) {
  const ids = new Set<string>();
  for (const event of events) {
    const id = event.visitor_id || event.user_id;
    if (id) ids.add(id);
  }
  return ids.size;
}

function rankContent(events: AnalyticsEvent[]) {
  const map = new Map<string, RankedItem>();

  for (const event of events) {
    if (!event.media_type || !event.media_id) continue;
    const key = `${event.media_type}-${event.media_id}`;
    const current = map.get(key) || {
      label: event.title || `${event.media_type.toUpperCase()} ${event.media_id}`,
      value: 0,
      mediaType: event.media_type,
      mediaId: event.media_id,
    };
    current.value += 1;
    if (!current.label && event.title) current.label = event.title;
    map.set(key, current);
  }

  return [...map.values()].sort((a, b) => b.value - a.value).slice(0, 8);
}

function rankSearches(events: AnalyticsEvent[]) {
  const map = new Map<string, RankedItem>();

  for (const event of events) {
    const query = event.search_query?.trim();
    if (!query) continue;
    const key = query.toLowerCase();
    const current = map.get(key) || { label: query, value: 0 };
    current.value += 1;
    map.set(key, current);
  }

  return [...map.values()].sort((a, b) => b.value - a.value).slice(0, 8);
}

function dailyTraffic(events: AnalyticsEvent[]): DailyTraffic[] {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = daysAgo(6 - index);
    return dayKey(date);
  });
  const map = new Map(days.map((date) => [date, { date, pageViews: 0, visitors: new Set<string>(), watchClicks: 0 }]));

  for (const event of events) {
    const date = dayKey(event.created_at);
    const bucket = map.get(date);
    if (!bucket) continue;
    if (event.event_name === 'page_view') bucket.pageViews += 1;
    if (event.event_name === 'watch_click') bucket.watchClicks += 1;
    const visitor = event.visitor_id || event.user_id;
    if (visitor) bucket.visitors.add(visitor);
  }

  return [...map.values()].map((bucket) => ({
    date: bucket.date,
    pageViews: bucket.pageViews,
    visitors: bucket.visitors.size,
    watchClicks: bucket.watchClicks,
  }));
}

export async function GET(request: Request) {
  try {
    const token = bearer(request);
    if (!token) return jsonError('Login required', 401);
    const admin = await requireAdmin(token);

    const sinceToday = `${dayKey(new Date())}T00:00:00.000Z`;
    const since7d = isoDaysAgo(7);

    const [
      totalCatalog,
      readyLinks,
      brokenLinks,
      users,
      favorites,
      watchHistory,
      memberships,
      premiumMembers,
      reports,
      reports7d,
      sections,
      categories,
      events7d,
    ] = await Promise.all([
      countRows('tmdb_catalog?select=tmdb_id&limit=10000'),
      countRows('admin_movie_links?watch_url=not.is.null&select=tmdb_id&limit=10000'),
      countRows('admin_movie_links?status=eq.broken&select=tmdb_id&limit=10000'),
      countRows('profiles?select=id&limit=10000'),
      countRows('favorites?select=id&limit=10000'),
      countRows('watch_history?select=id&limit=10000'),
      countRows('memberships?select=id&limit=10000'),
      countRows('memberships?status=eq.active&select=id&limit=10000'),
      countRows('link_reports?select=id&limit=10000'),
      countRows(`link_reports?created_at=gte.${encodeURIComponent(since7d)}&select=id&limit=10000`),
      countRows('admin_sections?select=id&limit=10000'),
      countRows('admin_categories?select=id&limit=10000'),
      getRows<AnalyticsEvent>(`analytics_events?select=event_name,page_path,media_type,media_id,title,search_query,visitor_id,user_id,device,created_at&created_at=gte.${encodeURIComponent(since7d)}&order=created_at.desc&limit=10000`),
    ]);

    const todayEvents = events7d.filter((event) => event.created_at >= sinceToday);
    const pageViewsToday = todayEvents.filter((event) => event.event_name === 'page_view').length;
    const pageViews7d = events7d.filter((event) => event.event_name === 'page_view').length;
    const watchClicks7d = events7d.filter((event) => event.event_name === 'watch_click').length;
    const detailOpens7d = events7d.filter((event) => event.event_name === 'detail_open').length;
    const searches7d = events7d.filter((event) => event.event_name === 'search').length;
    const missingLinks = Math.max(totalCatalog - readyLinks, 0);

    const missingSamples = await getRows<Array<{ tmdb_id: number; media_type: string; title?: string | null; poster_url?: string | null; rating?: number | null; year?: string | null }>[number]>(
      'tmdb_catalog?select=tmdb_id,media_type,title,poster_url,rating,year&order=rating.desc&limit=12'
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
        reports7d,
        sections,
        categories,
        visitorsToday: uniqueVisitors(todayEvents),
        visitors7d: uniqueVisitors(events7d),
        pageViewsToday,
        pageViews7d,
        watchClicks7d,
        detailOpens7d,
        searches7d,
        totalEvents7d: events7d.length,
      },
      analytics: {
        enabled: events7d.length > 0,
        dailyTraffic: dailyTraffic(events7d),
        topContent: rankContent(events7d.filter((event) => event.event_name === 'detail_open' || event.event_name === 'watch_click' || event.media_id)),
        topSearches: rankSearches(events7d),
      },
      health: {
        supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
        tmdbConfigured: Boolean(process.env.TMDB_ACCESS_TOKEN),
        analyticsTableReady: events7d.length > 0,
        generatedAt: new Date().toISOString(),
      },
      tasks: [
        { title: 'เติมลิงก์หนังที่ยังไม่มี', value: missingLinks, tone: 'red' },
        { title: 'ตรวจลิงก์เสีย', value: brokenLinks + reports7d, tone: 'orange' },
        { title: 'วิเคราะห์คำค้น 7 วัน', value: searches7d, tone: 'blue' },
        { title: 'ตรวจคอนเทนต์ที่คนกดดู', value: watchClicks7d + detailOpens7d, tone: 'purple' },
      ],
      missingSamples: missingSamples || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot load dashboard';
    return jsonError(message, message === 'Admin only' ? 403 : 500);
  }
}
