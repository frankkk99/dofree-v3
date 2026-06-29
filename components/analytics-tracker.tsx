'use client';

import { useEffect } from 'react';

type AnalyticsEvent = {
  eventName: string;
  pagePath?: string;
  pageTitle?: string;
  mediaType?: 'movie' | 'tv';
  mediaId?: number;
  title?: string;
  searchQuery?: string;
  sectionSlug?: string;
  referrer?: string;
  visitorId?: string;
  device?: string;
  metadata?: Record<string, unknown>;
};

const visitorKey = 'dodeedee_visitor_id';

function getVisitorId() {
  try {
    const existing = window.localStorage.getItem(visitorKey);
    if (existing) return existing;
    const next = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(visitorKey, next);
    return next;
  } catch {
    return undefined;
  }
}

function deviceType() {
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|iphone|android/.test(ua)) return 'mobile';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  return 'desktop';
}

function currentPayload(eventName: string): AnalyticsEvent {
  return {
    eventName,
    pagePath: `${window.location.pathname}${window.location.search}`,
    pageTitle: document.title,
    referrer: document.referrer || undefined,
    visitorId: getVisitorId(),
    device: deviceType(),
  };
}

function postAnalytics(payload: AnalyticsEvent) {
  const body = JSON.stringify(payload);
  const url = '/api/analytics';

  if ('sendBeacon' in navigator) {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon(url, blob)) return;
  }

  void fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => null);
}

function parseMediaPath(pathname: string) {
  const [mediaType, id] = pathname.split('/').filter(Boolean);
  if ((mediaType === 'movie' || mediaType === 'tv') && Number(id)) {
    return { mediaType, mediaId: Number(id) } as const;
  }
  if (mediaType === 'watch') {
    const [, watchMediaType, watchId] = pathname.split('/').filter(Boolean);
    if ((watchMediaType === 'movie' || watchMediaType === 'tv') && Number(watchId)) {
      return { mediaType: watchMediaType, mediaId: Number(watchId) } as const;
    }
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

function trackPageView() {
  const payload = { ...currentPayload('page_view'), ...mediaPayload(window.location.pathname) };

  const searchQuery = new URLSearchParams(window.location.search).get('q') || undefined;
  if (window.location.pathname === '/search' && searchQuery) {
    postAnalytics({ ...payload, eventName: 'search', searchQuery });
  }

  postAnalytics(payload);
}

function trackClick(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const link = target.closest('a');
  const button = target.closest('button');
  const href = link?.getAttribute('href') || '';

  if (href) {
    try {
      const url = new URL(href, window.location.origin);
      const media = parseMediaPath(url.pathname);
      if (media) {
        postAnalytics({
          ...currentPayload(url.pathname.startsWith('/watch/') ? 'watch_click' : 'movie_detail_open'),
          ...media,
          title: titleFromElement(link),
          metadata: { href: url.pathname },
        });
        return;
      }

      const actorId = parseActorPath(url.pathname);
      if (actorId) {
        postAnalytics({
          ...currentPayload('actor_open'),
          title: titleFromElement(link),
          metadata: { href: url.pathname, actorId },
        });
        return;
      }
    } catch {
      // Ignore malformed hrefs.
    }
  }

  const label = titleFromElement(button || link || target);
  if (!label) return;

  if (label.includes('รับชม')) {
    postAnalytics({ ...currentPayload('watch_click'), ...mediaPayload(window.location.pathname), title: document.title, metadata: { label } });
    return;
  }

  if (label.includes('รายการโปรด')) {
    const isRemove = /ลบ|เอาออก|remove|unfavorite/i.test(label);
    postAnalytics({ ...currentPayload(isRemove ? 'favorite_remove' : 'favorite_add'), metadata: { label } });
    return;
  }

  if (label.includes('ประวัติ')) {
    postAnalytics({ ...currentPayload('history_click'), metadata: { label } });
    return;
  }

  if ((label.includes('ลิงก์เสีย') || label.includes('แจ้ง')) && label.includes('ลิงก์')) {
    postAnalytics({ ...currentPayload('report_broken_link'), ...mediaPayload(window.location.pathname), metadata: { label } });
    return;
  }

  if (/premium|สมาชิก|สมัคร/i.test(label)) {
    postAnalytics({ ...currentPayload('premium_click'), metadata: { label } });
    return;
  }

  if (button && button.closest('#dynamic-category-chip-row, main section.sticky')) {
    postAnalytics({ ...currentPayload('category_click'), sectionSlug: label, metadata: { label } });
  }
}

function trackSubmit(event: SubmitEvent) {
  const target = event.target;
  if (!(target instanceof HTMLFormElement)) return;

  const formData = new FormData(target);
  const query = String(formData.get('q') || '').trim();
  if (query) postAnalytics({ ...currentPayload('search'), searchQuery: query });
}

export function AnalyticsTracker() {
  useEffect(() => {
    trackPageView();

    document.addEventListener('click', trackClick, true);
    document.addEventListener('submit', trackSubmit, true);
    window.addEventListener('popstate', trackPageView);

    return () => {
      document.removeEventListener('click', trackClick, true);
      document.removeEventListener('submit', trackSubmit, true);
      window.removeEventListener('popstate', trackPageView);
    };
  }, []);

  return null;
}
