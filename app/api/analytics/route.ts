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
  referrer?: unknown;
  visitorId?: unknown;
  visitor_id?: unknown;
  device?: unknown;
  metadata?: unknown;
};

const allowedEvents = new Set([
  'page_view',
  'detail_open',
  'watch_click',
  'search',
  'category_click',
  'favorite_click',
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

function cleanMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => /^[a-z0-9_:-]{1,40}$/i.test(key))
      .slice(0, 20)
      .map(([key, entry]) => [key, typeof entry === 'string' ? entry.slice(0, 240) : entry])
  );
}

function userAgent(request: Request) {
  return (request.headers.get('user-agent') || '').slice(0, 400) || null;
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

  const record = {
    event_name: eventName,
    page_path: cleanText(body.pagePath ?? body.page_path, 500),
    page_title: cleanText(body.pageTitle ?? body.page_title, 240),
    media_type: cleanMediaType(body.mediaType ?? body.media_type),
    media_id: cleanNumber(body.mediaId ?? body.media_id),
    title: cleanText(body.title, 240),
    search_query: cleanText(body.searchQuery ?? body.search_query, 180),
    section_slug: cleanText(body.sectionSlug ?? body.section_slug, 80),
    referrer: cleanText(body.referrer, 500),
    visitor_id: cleanText(body.visitorId ?? body.visitor_id, 120),
    device: clientDevice(body, request),
    user_agent: userAgent(request),
    metadata: cleanMetadata(body.metadata),
  };

  try {
    await supabaseRest('analytics_events', {
      method: 'POST',
      mode: 'service',
      prefer: 'return=minimal',
      body: [record],
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Analytics must never break the public website. If the migration/env is missing,
    // report a soft success so the browser can continue normally.
    return NextResponse.json({ ok: true, disabled: true, reason: error instanceof Error ? error.message : 'analytics unavailable' });
  }
}
