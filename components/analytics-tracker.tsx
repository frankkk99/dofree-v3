'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { mediaIdFromSlug } from '@/lib/seo';

type AnalyticsEvent = {
  eventName: string;
  pagePath?: string;
  pageTitle?: string;
  mediaType?: 'movie' | 'tv';
  mediaId?: number;
  title?: string;
  searchQuery?: string;
  sectionSlug?: string;
  adCode?: string;
  referrer?: string;
  visitorId?: string;
  sessionId?: string;
  device?: string;
  browser?: string;
  os?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  metadata?: Record<string, unknown>;
};

const visitorKey = 'dodeedee_visitor_id';
const sessionKey = 'dodeedee_session_id';
const sessionStartedKey = 'dodeedee_session_started_at';
const sessionMaxAgeMs = 30 * 60 * 1000;

declare global {
  interface Window {
    dofreeTrack?: (eventName: string, payload?: Partial<AnalyticsEvent>) => void;
  }
}

function randomId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getVisitorId() {
  try {
    const existing = window.localStorage.getItem(visitorKey);
    if (existing) return existing;
    const next = randomId();
    window.localStorage.setItem(visitorKey, next);
    return next;
  } catch {
    return undefined;
  }
}

function getSessionId() {
  try {
    const now = Date.now();
    const startedAt = Number(window.sessionStorage.getItem(sessionStartedKey) || 0);
    const existing = window.sessionStorage.getItem(sessionKey);
    if (existing && startedAt && now - startedAt < sessionMaxAgeMs) {
      window.sessionStorage.setItem(sessionStartedKey, String(now));
      return { sessionId: existing, isNew: false };
    }

    const next = randomId();
    window.sessionStorage.setItem(sessionKey, next);
    window.sessionStorage.setItem(sessionStartedKey, String(now));
    return { sessionId: next, isNew: true };
  } catch {
    return { sessionId: getVisitorId(), isNew: false };
  }
}

function deviceType() {
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|iphone|android/.test(ua)) return 'mobile';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  return 'desktop';
}

function browserType() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('fb_iab') || ua.includes('fbav')) return 'facebook_in_app';
  if (ua.includes('line/')) return 'line_in_app';
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('crios') || ua.includes('chrome/')) return 'chrome';
  if (ua.includes('safari/')) return 'safari';
  if (ua.includes('firefox/')) return 'firefox';
  return 'other';
}

function osType() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
  if (ua.includes('android')) return 'android';
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('mac os')) return 'macos';
  return 'other';
}

function utmPayload() {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
  };
}

function currentPayload(eventName: string): AnalyticsEvent {
  const session = getSessionId();
  return {
    eventName,
    pagePath: `${window.location.pathname}${window.location.search}`,
    pageTitle: document.title,
    referrer: document.referrer || undefined,
    visitorId: getVisitorId(),
    sessionId: session.sessionId,
    device: deviceType(),
    browser: browserType(),
    os: osType(),
    ...utmPayload(),
    metadata: {
      width: window.innerWidth,
      height: window.innerHeight,
      language: navigator.language,
    },
  };
}

function postAnalytics(payload: AnalyticsEvent) {
  const body = JSON.stringify(payload);
  if ('sendBeacon' in navigator) {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon('/api/analytics', blob)) return;
  }

  void fetch('/api/analytics', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => null);
}

function parseMediaPath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  const [mediaType, id] = parts;
  const mediaId = Number(mediaIdFromSlug(id || ''));
  if ((mediaType === 'movie' || mediaType === 'tv') && mediaId) return { mediaType, mediaId } as const;

  if (mediaType === 'watch') {
    const [, watchMediaType, watchId] = parts;
    const watchMediaId = Number(mediaIdFromSlug(watchId || ''));
    if ((watchMediaType === 'movie' || watchMediaType === 'tv') && watchMediaId) return { mediaType: watchMediaType, mediaId: watchMediaId } as const;
  }

  return null;
}

function parseActorPath(pathname: string) {
  const [entity, id] = pathname.split('/').filter(Boolean);
  if ((entity === 'actor' || entity === 'person') && Number(id)) return Number(id);
  return null;
}

function mediaPayload(pathname: string): Pick<AnalyticsEvent, 'mediaType' | 'mediaId'> {
  return parseMediaPath(pathname) || {};
}

function titleFromElement(element: Element | null) {
  const text = element?.textContent?.replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, 180) : undefined;
}

function trackEvent(eventName: string, payload: Partial<AnalyticsEvent> = {}) {
  const base = currentPayload(eventName);
  postAnalytics({ ...base, ...payload, metadata: { ...(base.metadata || {}), ...(payload.metadata || {}) } });
}

function trackPageView() {
  const payload = { ...currentPayload('page_view'), ...mediaPayload(window.location.pathname) };
  const searchQuery = new URLSearchParams(window.location.search).get('q') || undefined;
  postAnalytics(payload);

  if (window.location.pathname === '/search' && searchQuery) postAnalytics({ ...payload, eventName: 'search', searchQuery });

  const media = parseMediaPath(window.location.pathname);
  if (media) postAnalytics({ ...payload, eventName: media.mediaType === 'tv' ? 'tv_detail_open' : 'movie_detail_open', ...media, title: document.title });
}

function trackClick(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const adClose = target.closest('[data-ad-close]') as HTMLElement | null;
  if (adClose?.dataset.adClose) {
    trackEvent('ad_close', { adCode: adClose.dataset.adClose, metadata: { label: titleFromElement(adClose) } });
    return;
  }

  const adSlot = target.closest('[data-ad-slot]') as HTMLElement | null;
  const adCode = adSlot?.dataset.adSlot || adSlot?.dataset.adCode;
  if (adCode && target.closest('a')) {
    trackEvent('ad_click', { adCode, metadata: { href: (target.closest('a') as HTMLAnchorElement | null)?.href || '' } });
    return;
  }

  const link = target.closest('a');
  const button = target.closest('button');
  const href = link?.getAttribute('href') || '';

  if (href === '#watch' || href.endsWith('#watch')) {
    trackEvent('watch_click', { ...mediaPayload(window.location.pathname), title: document.title, metadata: { href } });
    return;
  }

  if (href === '#trailer' || href.endsWith('#trailer')) {
    trackEvent('trailer_click', { ...mediaPayload(window.location.pathname), title: document.title, metadata: { href } });
    return;
  }

  if (href) {
    try {
      const url = new URL(href, window.location.origin);
      const media = parseMediaPath(url.pathname);
      if (media) {
        postAnalytics({ ...currentPayload(url.pathname.startsWith('/watch/') ? 'watch_click' : media.mediaType === 'tv' ? 'tv_detail_open' : 'movie_detail_open'), ...media, title: titleFromElement(link), metadata: { href: url.pathname } });
        return;
      }

      const actorId = parseActorPath(url.pathname);
      if (actorId) {
        trackEvent('actor_open', { title: titleFromElement(link), metadata: { href: url.pathname, actorId } });
        return;
      }

      if (url.pathname.startsWith('/clips')) {
        trackEvent('clip_open', { title: titleFromElement(link), metadata: { href: url.pathname } });
        return;
      }
    } catch {
      // Ignore malformed hrefs.
    }
  }

  const label = titleFromElement(button || link || target);
  if (!label) return;

  if (label.includes('รับชม') || label.includes('พร้อมดู') || label.includes('เริ่มดู')) {
    trackEvent('watch_click', { ...mediaPayload(window.location.pathname), title: document.title, metadata: { label } });
    return;
  }

  if (label.includes('ตัวอย่าง') || label.toLowerCase().includes('trailer')) {
    trackEvent('trailer_click', { ...mediaPayload(window.location.pathname), title: document.title, metadata: { label } });
    return;
  }

  if (label.includes('รายการโปรด')) {
    const isRemove = /ลบ|เอาออก|remove|unfavorite|อยู่ในรายการโปรด/i.test(label);
    trackEvent(isRemove ? 'favorite_remove' : 'favorite_add', { ...mediaPayload(window.location.pathname), title: document.title, metadata: { label } });
    return;
  }

  if (label.includes('ประวัติ')) {
    trackEvent('history_click', { metadata: { label } });
    return;
  }

  if ((label.includes('ลิงก์เสีย') || label.includes('แจ้ง')) && label.includes('ลิงก์')) {
    trackEvent('report_broken_link', { ...mediaPayload(window.location.pathname), metadata: { label } });
    return;
  }

  if (/premium|สมาชิก|สมัคร/i.test(label)) {
    trackEvent('premium_click', { metadata: { label } });
    return;
  }

  if (button && button.closest('#dynamic-category-chip-row, main section.sticky')) {
    trackEvent('category_click', { sectionSlug: label, metadata: { label } });
  }
}

function trackSubmit(event: SubmitEvent) {
  const target = event.target;
  if (!(target instanceof HTMLFormElement)) return;
  const query = String(new FormData(target).get('q') || '').trim();
  if (query) trackEvent('search', { searchQuery: query });
}

function setupAdViewObserver() {
  if (typeof IntersectionObserver === 'undefined') return () => undefined;
  const seen = new Set<string>();
  const observed = new WeakSet<Element>();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const element = entry.target as HTMLElement;
      const code = element.dataset.adSlot || element.dataset.adCode;
      if (!code || !entry.isIntersecting || entry.intersectionRatio < 0.35) continue;
      const key = `${window.location.pathname}${window.location.search}:${code}`;
      if (seen.has(key)) continue;
      seen.add(key);
      trackEvent('ad_view', { adCode: code, metadata: { ratio: Math.round(entry.intersectionRatio * 100) } });
    }
  }, { threshold: [0.35, 0.65] });

  const scan = () => {
    document.querySelectorAll('[data-ad-slot]').forEach((node) => {
      if (observed.has(node)) return;
      observed.add(node);
      observer.observe(node);
    });
  };

  scan();
  const mutationObserver = new MutationObserver(scan);
  mutationObserver.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    mutationObserver.disconnect();
  };
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPageRef = useRef('');

  useEffect(() => {
    const session = getSessionId();
    if (session.isNew) trackEvent('session_start');
    window.dofreeTrack = trackEvent;

    const customListener = ((event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      if (!detail?.eventName) return;
      trackEvent(detail.eventName, detail.payload || {});
    }) as EventListener;

    window.addEventListener('dofree-analytics-event', customListener);
    document.addEventListener('click', trackClick, true);
    document.addEventListener('submit', trackSubmit, true);
    const cleanupAdObserver = setupAdViewObserver();
    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === 'visible') trackEvent('heartbeat', { metadata: { visible: true } });
    }, 45_000);

    return () => {
      window.removeEventListener('dofree-analytics-event', customListener);
      document.removeEventListener('click', trackClick, true);
      document.removeEventListener('submit', trackSubmit, true);
      cleanupAdObserver?.();
      window.clearInterval(heartbeat);
      delete window.dofreeTrack;
    };
  }, []);

  useEffect(() => {
    const key = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : pathname || '';
    if (!pathname || lastPageRef.current === key) return;
    lastPageRef.current = key;
    trackPageView();
  }, [pathname]);

  return null;
}
