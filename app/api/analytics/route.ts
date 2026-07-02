import { NextResponse } from 'next/server';
import { supabaseRest } from '@/lib/supabase-rest';

type AnalyticsEventInput = {
  eventName?: unknown;
  event_name?: unknown;
  pagePath?: unknown;
  page_path?: unknown;
  pageTitle?: unknown;
  page_title?: unknown;
  mediaType?: unknown;
  media_type?: unknown;
  mediaId?: unknown;
  media_id?: unknown;
  title?: unknown;
  searchQuery?: unknown;
  search_query?: unknown;
  sectionSlug?: unknown;
  section_slug?: unknown;
  adCode?: unknown;
  ad_code?: unknown;
  referrer?: unknown;
  visitorId?: unknown;
  visitor_id?: unknown;
  sessionId?: unknown;
  session_id?: unknown;
  userId?: unknown;
  user_id?: unknown;
  device?: unknown;
  browser?: unknown;
  os?: unknown;
  utmSource?: unknown;
  utm_source?: unknown;
  utmMedium?: unknown;
  utm_medium?: unknown;
  utmCampaign?: unknown;
  utm_campaign?: unknown;
  metadata?: unknown;
};

const allowedEvents = new Set([
  'page_view',
  'session_start',
  'heartbeat',
  'movie_detail_open',
  'tv_detail_open',
  'detail_open',
  'watch_click',
  'trailer_click',
  'search',
  'search_no_result',
  'search_result_click',
  'favorite_add',
  'favorite_remove',
  'favorite_click',
  'actor_open',
  'clip_open',
  'ad_view',
  'ad_click',
  'ad_close',
  'login_success',
  'signup_success',
  'premium_click',
  'report_broken_link',
  'category_click',
  'history_click',
  'link_report',
  'admin_view',
]);

function cleanText(value: unknown, maxLength = 240) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function cleanEventName(value: unknown) {
  const eventName = cleanText(value, 64)?.replace(/[^a-z0-9_:-]/gi, '_').toLowerCase();
  if (!eventName) return null;
  return allowedEvents.has(eventName) ? eventName : 'page_view';
}

function cleanMediaType(value: unknown) {
  const mediaType = cleanText(value, 12);
  return mediaType === 'movie' || mediaType === 'tv' ? mediaType : null;
}

function cleanNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

function cleanUuid(value: unknown) {
  const text = cleanText(value, 80);
  return text && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : null;
}

function cleanMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => /^[a-z0-9_:-]{1,40}$/i.test(key))
      .slice(0, 30)
      .map(([key, entry]) => [key, typeof entry === 'string' ? entry.slice(0, 300) : entry])
  );
}

function userAgent(request: Request) {
  return (request.headers.get('user-agent') || '').slice(0, 500) || null;
}

function inferBrowser(ua: string) {
  const text = ua.toLowerCase();
  if (text.includes('edg/')) return 'edge';
  if (text.includes('fb_iab') || text.includes('fbav')) return 'facebook_in_app';
  if (text.includes('line/')) return 'line_in_app';
  if (text.includes('crios') || text.includes('chrome/')) return 'chrome';
  if (text.includes('safari/') && !text.includes('chrome/')) return 'safari';
  if (text.includes('firefox/')) return 'firefox';
  return 'other';
}

function inferOs(ua: string) {
  const text = ua.toLowerCase();
  if (text.includes('iphone') || text.includes('ipad') || text.includes('ios')) return 'ios';
  if (text.includes('android')) return 'android';
  if (text.includes('windows')) return 'windows';
  if (text.includes('mac os')) return 'macos';
  return 'other';
}

function clientDevice(input: AnalyticsEventInput, request: Request) {
  const explicit = cleanText(input.device, 32);
  if (explicit) return explicit;

  const ua = userAgent(request)?.toLowerCase() || '';
  if (/mobile|iphone|android/.test(ua)) return 'mobile';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  return 'desktop';
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AnalyticsEventInput | null;
  if (!body) return NextResponse.json({ ok: true, skipped: true });

  const eventName = cleanEventName(body.eventName ?? body.event_name);
  if (!eventName) return NextResponse.json({ ok: true, skipped: true });

  const ua = userAgent(request);
  const searchQuery = cleanText(body.searchQuery ?? body.search_query, 220);
  const mediaId = cleanNumber(body.mediaId ?? body.media_id);
  const record = {
    event_name: eventName,
    event_type: eventName,
    page_path: cleanText(body.pagePath ?? body.page_path, 700),
    path: cleanText(body.pagePath ?? body.page_path, 700),
    page_title: cleanText(body.pageTitle ?? body.page_title, 260),
    media_type: cleanMediaType(body.mediaType ?? body.media_type),
    media_id: mediaId,
    tmdb_id: mediaId,
    title: cleanText(body.title, 260),
    search_query: searchQuery,
    query: searchQuery,
    section_slug: cleanText(body.sectionSlug ?? body.section_slug, 100),
    ad_code: cleanText(body.adCode ?? body.ad_code, 80),
    referrer: cleanText(body.referrer, 700),
    visitor_id: cleanText(body.visitorId ?? body.visitor_id, 160),
    session_id: cleanText(body.sessionId ?? body.session_id ?? body.visitorId ?? body.visitor_id, 160),
    user_id: cleanUuid(body.userId ?? body.user_id),
    device: clientDevice(body, request),
    browser: cleanText(body.browser, 60) || (ua ? inferBrowser(ua) : null),
    os: cleanText(body.os, 60) || (ua ? inferOs(ua) : null),
    utm_source: cleanText(body.utmSource ?? body.utm_source, 120),
    utm_medium: cleanText(body.utmMedium ?? body.utm_medium, 120),
    utm_campaign: cleanText(body.utmCampaign ?? body.utm_campaign, 160),
    user_agent: ua,
    metadata: cleanMetadata(body.metadata),
  };

  const legacyRecord = {
    event_name: record.event_name,
    page_path: record.page_path,
    page_title: record.page_title,
    media_type: record.media_type,
    media_id: record.media_id,
    title: record.title,
    search_query: record.search_query,
    section_slug: record.section_slug,
    referrer: record.referrer,
    visitor_id: record.visitor_id,
    device: record.device,
    user_agent: record.user_agent,
    metadata: record.metadata,
  };

  try {
    await supabaseRest('analytics_events', {
      method: 'POST',
      mode: 'service',
      prefer: 'return=minimal',
      body: [record],
    });

    return NextResponse.json({ ok: true });
  } catch (firstError) {
    try {
      await supabaseRest('analytics_events', {
        method: 'POST',
        mode: 'service',
        prefer: 'return=minimal',
        body: [legacyRecord],
      });

      return NextResponse.json({ ok: true, legacy: true });
    } catch (error) {
      return NextResponse.json({ ok: true, disabled: true, reason: error instanceof Error ? error.message : firstError instanceof Error ? firstError.message : 'analytics unavailable' });
    }
  }
}
