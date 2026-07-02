import { NextResponse } from 'next/server';
import { supabaseRest, supabaseRestCount } from '@/lib/supabase-rest';

type AuthUser = { id: string; email?: string; phone?: string };
type ProfileRecord = { id: string; role?: string | null };
type AnalyticsEvent = {
  event_name: string;
  page_path?: string | null;
  media_type?: 'movie' | 'tv' | null;
  media_id?: number | null;
  title?: string | null;
  search_query?: string | null;
  ad_code?: string | null;
  visitor_id?: string | null;
  session_id?: string | null;
  user_id?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  referrer?: string | null;
  utm_source?: string | null;
  created_at: string;
};
type DailyTraffic = { date: string; pageViews: number; visitors: number; sessions: number; watchClicks: number; searches: number; adViews: number };
type RankedItem = { label: string; value: number; mediaType?: 'movie' | 'tv'; mediaId?: number; watchClicks?: number; detailOpens?: number };
type RankedAd = { code: string; views: number; clicks: number; closes: number; ctr: number; closeRate: number };
type ReadyLinkRow = { tmdb_id: number; media_type: 'movie' | 'tv' };
type MissingCatalogSample = { tmdb_id: number; media_type: 'movie' | 'tv'; title?: string | null; poster_url?: string | null; rating?: number | null; release_year?: string | null };

const dashboardRoles = new Set(['owner', 'admin', 'super_admin']);
const rangeDays = { today: 1, '7d': 7, '30d': 30, '90d': 90 } as const;

function normalizeRole(value?: string | null) { return String(value || 'viewer').trim().toLowerCase(); }
function supabaseUrl() { return process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ''); }
function anonKey() { return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; }
function bearer(request: Request) { return (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim() || null; }
function jsonError(message: string, status = 400) { return NextResponse.json({ ok: false, error: message }, { status }); }
function daysAgo(days: number) { const date = new Date(); date.setDate(date.getDate() - days); return date; }
function isoDaysAgo(days: number) { return daysAgo(days).toISOString(); }
function dayKey(value: string | Date) { return (value instanceof Date ? value.toISOString() : value).slice(0, 10); }
function mediaKey(mediaType: string, tmdbId: number) { return `${mediaType}-${tmdbId}`; }
function eventCount(events: AnalyticsEvent[], name: string) { return events.filter((event) => event.event_name === name).length; }
function pct(value: number, total: number) { return total ? Math.round((value / total) * 1000) / 10 : 0; }
function isDetailOpen(eventName: string) { return eventName === 'detail_open' || eventName === 'movie_detail_open' || eventName === 'tv_detail_open'; }

async function currentUser(token: string) {
  const url = supabaseUrl();
  const key = anonKey();
  if (!url || !key) throw new Error('Missing Supabase public env');
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!response.ok) throw new Error('Unauthorized');
  return (await response.json()) as AuthUser;
}

async function requireAdmin(token: string) {
  const user = await currentUser(token);
  const profiles = await supabaseRest<ProfileRecord[]>(`profiles?id=eq.${encodeURIComponent(user.id)}&select=id,role&limit=1`);
  const role = normalizeRole(profiles?.[0]?.role);
  if (!dashboardRoles.has(role)) throw new Error('Admin only');
  return { user, role };
}

async function countRows(path: string) { try { return await supabaseRestCount(path, { cache: 'no-store' }); } catch { return 0; } }
async function getRows<T>(path: string) { try { return await supabaseRest<T[]>(path, { cache: 'no-store' }); } catch { return []; } }
function uniqueBy(events: AnalyticsEvent[], key: 'visitor_id' | 'session_id' | 'user_id') {
  const ids = new Set<string>();
  for (const event of events) { const id = event[key]; if (id) ids.add(id); }
  return ids.size;
}

function rankContent(events: AnalyticsEvent[]) {
  const map = new Map<string, RankedItem>();
  for (const event of events) {
    if (!event.media_type || !event.media_id) continue;
    const key = `${event.media_type}-${event.media_id}`;
    const current = map.get(key) || { label: event.title || `${event.media_type.toUpperCase()} ${event.media_id}`, value: 0, mediaType: event.media_type, mediaId: event.media_id, watchClicks: 0, detailOpens: 0 };
    current.value += 1;
    if (event.event_name === 'watch_click') current.watchClicks = (current.watchClicks || 0) + 1;
    if (isDetailOpen(event.event_name)) current.detailOpens = (current.detailOpens || 0) + 1;
    if (event.title && current.label.startsWith(event.media_type.toUpperCase())) current.label = event.title;
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => b.value - a.value).slice(0, 10);
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
  return [...map.values()].sort((a, b) => b.value - a.value).slice(0, 10);
}

function rankPages(events: AnalyticsEvent[]) {
  const map = new Map<string, RankedItem>();
  for (const event of events) {
    if (event.event_name !== 'page_view') continue;
    const path = event.page_path || '/';
    const current = map.get(path) || { label: path, value: 0 };
    current.value += 1;
    map.set(path, current);
  }
  return [...map.values()].sort((a, b) => b.value - a.value).slice(0, 10);
}

function splitBy(events: AnalyticsEvent[], key: 'device' | 'browser' | 'os' | 'utm_source') {
  const map = new Map<string, number>();
  for (const event of events) {
    if (event.event_name !== 'page_view') continue;
    const label = event[key] || (key === 'utm_source' ? 'direct' : 'unknown');
    map.set(label, (map.get(label) || 0) + 1);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8);
}

function adPerformance(events: AnalyticsEvent[]): RankedAd[] {
  const map = new Map<string, RankedAd>();
  for (const event of events) {
    if (!event.ad_code || !event.event_name.startsWith('ad_')) continue;
    const row = map.get(event.ad_code) || { code: event.ad_code, views: 0, clicks: 0, closes: 0, ctr: 0, closeRate: 0 };
    if (event.event_name === 'ad_view') row.views += 1;
    if (event.event_name === 'ad_click') row.clicks += 1;
    if (event.event_name === 'ad_close') row.closes += 1;
    map.set(event.ad_code, row);
  }
  return [...map.values()].map((row) => ({ ...row, ctr: pct(row.clicks, row.views), closeRate: pct(row.closes, row.views) })).sort((a, b) => b.views - a.views).slice(0, 12);
}

function dailyTraffic(events: AnalyticsEvent[], days: number): DailyTraffic[] {
  const keys = Array.from({ length: days }, (_, index) => dayKey(daysAgo(days - 1 - index)));
  const map = new Map(keys.map((date) => [date, { date, pageViews: 0, visitors: new Set<string>(), sessions: new Set<string>(), watchClicks: 0, searches: 0, adViews: 0 }]));
  for (const event of events) {
    const bucket = map.get(dayKey(event.created_at));
    if (!bucket) continue;
    if (event.event_name === 'page_view') bucket.pageViews += 1;
    if (event.event_name === 'watch_click') bucket.watchClicks += 1;
    if (event.event_name === 'search') bucket.searches += 1;
    if (event.event_name === 'ad_view') bucket.adViews += 1;
    if (event.visitor_id) bucket.visitors.add(event.visitor_id);
    if (event.session_id) bucket.sessions.add(event.session_id);
  }
  return [...map.values()].map((bucket) => ({ date: bucket.date, pageViews: bucket.pageViews, visitors: bucket.visitors.size, sessions: bucket.sessions.size, watchClicks: bucket.watchClicks, searches: bucket.searches, adViews: bucket.adViews }));
}

function missingCatalogSamples(candidates: MissingCatalogSample[], readyLinks: ReadyLinkRow[]) {
  const ready = new Set(readyLinks.map((row) => mediaKey(row.media_type, row.tmdb_id)));
  const seen = new Set<string>();
  return candidates.filter((row) => { const key = mediaKey(row.media_type, row.tmdb_id); if (ready.has(key) || seen.has(key)) return false; seen.add(key); return true; }).slice(0, 12).map((row) => ({ tmdb_id: row.tmdb_id, media_type: row.media_type, title: row.title, poster_url: row.poster_url, rating: row.rating, year: row.release_year }));
}

export async function GET(request: Request) {
  try {
    const token = bearer(request);
    if (!token) return jsonError('Login required', 401);
    const admin = await requireAdmin(token);
    const url = new URL(request.url);
    const range = (url.searchParams.get('range') || '7d') as keyof typeof rangeDays;
    const days = rangeDays[range] || 7;
    const sinceToday = `${dayKey(new Date())}T00:00:00.000Z`;
    const sinceRange = days === 1 ? sinceToday : isoDaysAgo(days);
    const sinceActive = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const [totalCatalog, readyLinks, brokenLinks, users, favorites, watchHistory, memberships, premiumMembers, reports, reportsRange, sections, categories, posterReady, backdropReady, trailerLinks, eventsRange] = await Promise.all([
      countRows('tmdb_catalog?select=tmdb_id'),
      countRows('admin_movie_links?is_active=eq.true&watch_url=not.is.null&select=tmdb_id'),
      countRows('admin_movie_links?is_active=eq.true&status=eq.broken&select=tmdb_id'),
      countRows('profiles?select=id'),
      countRows('favorites?select=id'),
      countRows('watch_history?select=id'),
      countRows('memberships?select=id'),
      countRows('memberships?status=eq.active&select=id'),
      countRows('link_reports?select=id'),
      countRows(`link_reports?created_at=gte.${encodeURIComponent(sinceRange)}&select=id`),
      countRows('admin_sections?select=id'),
      countRows('admin_categories?select=id'),
      countRows('tmdb_catalog?poster_url=not.is.null&select=tmdb_id'),
      countRows('tmdb_catalog?backdrop_url=not.is.null&select=tmdb_id'),
      countRows('admin_movie_links?is_active=eq.true&trailer_url=not.is.null&select=tmdb_id'),
      getRows<AnalyticsEvent>(`analytics_events?select=event_name,page_path,media_type,media_id,title,search_query,ad_code,visitor_id,session_id,user_id,device,browser,os,referrer,utm_source,created_at&created_at=gte.${encodeURIComponent(sinceRange)}&order=created_at.desc&limit=20000`),
    ]);

    const todayEvents = eventsRange.filter((event) => event.created_at >= sinceToday);
    const activeEvents = eventsRange.filter((event) => event.created_at >= sinceActive);
    const pageViewsToday = eventCount(todayEvents, 'page_view');
    const pageViewsRange = eventCount(eventsRange, 'page_view');
    const watchClicksToday = eventCount(todayEvents, 'watch_click');
    const watchClicksRange = eventCount(eventsRange, 'watch_click');
    const detailOpensRange = eventsRange.filter((event) => isDetailOpen(event.event_name)).length;
    const searchesToday = eventCount(todayEvents, 'search');
    const searchesRange = eventCount(eventsRange, 'search');
    const adViewsRange = eventCount(eventsRange, 'ad_view');
    const adClicksRange = eventCount(eventsRange, 'ad_click');
    const adClosesRange = eventCount(eventsRange, 'ad_close');
    const missingLinks = Math.max(totalCatalog - readyLinks, 0);
    const missingPosters = Math.max(totalCatalog - posterReady, 0);
    const missingBackdrops = Math.max(totalCatalog - backdropReady, 0);
    const contentQualityScore = totalCatalog ? Math.round(((readyLinks / totalCatalog) * 45) + ((posterReady / totalCatalog) * 25) + ((backdropReady / totalCatalog) * 15) + ((Math.min(trailerLinks, totalCatalog) / totalCatalog) * 15)) : 0;

    const [readyLinkRows, missingCandidates] = await Promise.all([
      getRows<ReadyLinkRow>('admin_movie_links?is_active=eq.true&watch_url=not.is.null&select=tmdb_id,media_type&limit=10000'),
      getRows<MissingCatalogSample>('tmdb_catalog?select=tmdb_id,media_type,title,poster_url,rating,release_year&order=rating.desc&limit=120'),
    ]);

    return NextResponse.json({
      ok: true,
      admin,
      range: { key: rangeDays[range] ? range : '7d', days, since: sinceRange, generatedAt: new Date().toISOString() },
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
        reports7d: reportsRange,
        sections,
        categories,
        posterReady,
        backdropReady,
        trailerLinks,
        missingPosters,
        missingBackdrops,
        contentQualityScore,
        activeNow: uniqueBy(activeEvents, 'session_id') || uniqueBy(activeEvents, 'visitor_id'),
        visitorsToday: uniqueBy(todayEvents, 'visitor_id'),
        visitors7d: uniqueBy(eventsRange, 'visitor_id'),
        sessionsToday: uniqueBy(todayEvents, 'session_id'),
        sessions7d: uniqueBy(eventsRange, 'session_id'),
        pageViewsToday,
        pageViews7d: pageViewsRange,
        watchClicksToday,
        watchClicks7d: watchClicksRange,
        detailOpens7d: detailOpensRange,
        searchesToday,
        searches7d: searchesRange,
        adViews7d: adViewsRange,
        adClicks7d: adClicksRange,
        adCloses7d: adClosesRange,
        watchClickRate: pct(watchClicksRange, pageViewsRange),
        searchRate: pct(searchesRange, pageViewsRange),
        adCtr: pct(adClicksRange, adViewsRange),
        totalEvents7d: eventsRange.length,
      },
      analytics: {
        enabled: eventsRange.length > 0,
        dailyTraffic: dailyTraffic(eventsRange, Math.min(days, 30)),
        topContent: rankContent(eventsRange.filter((event) => isDetailOpen(event.event_name) || event.event_name === 'watch_click' || event.media_id)),
        topSearches: rankSearches(eventsRange),
        topPages: rankPages(eventsRange),
        devices: splitBy(eventsRange, 'device'),
        browsers: splitBy(eventsRange, 'browser'),
        sources: splitBy(eventsRange, 'utm_source'),
        ads: adPerformance(eventsRange),
      },
      health: {
        supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
        tmdbConfigured: Boolean(process.env.TMDB_ACCESS_TOKEN),
        analyticsTableReady: eventsRange.length > 0,
        generatedAt: new Date().toISOString(),
      },
      tasks: [
        { title: 'เติมลิงก์หนังที่ยังไม่มี', value: missingLinks, tone: 'red' },
        { title: 'ตรวจลิงก์เสีย', value: brokenLinks + reportsRange, tone: 'orange' },
        { title: `วิเคราะห์คำค้น ${days} วัน`, value: searchesRange, tone: 'blue' },
        { title: 'ตรวจคอนเทนต์ที่คนกดดู', value: watchClicksRange + detailOpensRange, tone: 'purple' },
      ],
      missingSamples: missingCatalogSamples(missingCandidates, readyLinkRows),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot load dashboard';
    return jsonError(message, message === 'Admin only' ? 403 : 500);
  }
}
