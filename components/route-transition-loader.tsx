'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function isSamePageUrl(url: URL) {
  return url.origin === window.location.origin && url.pathname === window.location.pathname && url.search === window.location.search;
}

function shouldIgnoreUrl(url: URL) {
  if (url.origin !== window.location.origin) return true;
  if (isSamePageUrl(url)) return true;
  return false;
}

export function RouteTransitionLoader() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [progress, setProgress] = useState(0);
  const activeRef = useRef(false);
  const startedAtRef = useRef(0);
  const hideTimerRef = useRef<number | null>(null);
  const unmountTimerRef = useRef<number | null>(null);
  const maxTimerRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const lastRouteRef = useRef('');

  function clearTimers() {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    if (unmountTimerRef.current) window.clearTimeout(unmountTimerRef.current);
    if (maxTimerRef.current) window.clearTimeout(maxTimerRef.current);
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    hideTimerRef.current = null;
    unmountTimerRef.current = null;
    maxTimerRef.current = null;
    progressTimerRef.current = null;
  }

  function startLoading(startAt = 0) {
    clearTimers();
    activeRef.current = true;
    startedAtRef.current = Date.now();
    setMounted(true);
    setProgress(startAt);
    window.requestAnimationFrame(() => setShown(true));

    progressTimerRef.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 96) return current;
        const step = current < 28 ? 7 : current < 64 ? 4 : current < 84 ? 2 : 1;
        return clampProgress(current + step);
      });
    }, 150);

    maxTimerRef.current = window.setTimeout(() => {
      finishLoading();
    }, 4200);
  }

  function finishLoading() {
    if (!activeRef.current) return;
    activeRef.current = false;
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    if (maxTimerRef.current) window.clearTimeout(maxTimerRef.current);
    progressTimerRef.current = null;
    maxTimerRef.current = null;
    setProgress(100);

    const elapsed = Date.now() - startedAtRef.current;
    const delay = Math.max(180, 380 - elapsed);
    hideTimerRef.current = window.setTimeout(() => {
      setShown(false);
      unmountTimerRef.current = window.setTimeout(() => {
        setMounted(false);
        setProgress(0);
      }, 320);
    }, delay);
  }

  function hardStopLoading() {
    clearTimers();
    activeRef.current = false;
    setShown(false);
    setMounted(false);
    setProgress(0);
  }

  useEffect(() => {
    lastRouteRef.current = `${window.location.pathname}${window.location.search}`;
    finishLoading();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    lastRouteRef.current = `${window.location.pathname}${window.location.search}`;

    function handleClick(event: MouseEvent) {
      if (isModifiedClick(event)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.closest('[data-no-route-loader="true"]')) return;
      if (anchor.target && anchor.target !== '_self') return;
      const rawHref = anchor.getAttribute('href') || '';
      if (rawHref.startsWith('#')) return;

      try {
        const url = new URL(anchor.href, window.location.href);
        if (shouldIgnoreUrl(url)) return;
        startLoading(0);
      } catch {}
    }

    function handlePopState() {
      const nextRoute = `${window.location.pathname}${window.location.search}`;
      if (nextRoute === lastRouteRef.current) {
        hardStopLoading();
        return;
      }
      lastRouteRef.current = nextRoute;
      startLoading(0);
    }

    function handleHashChange() {
      hardStopLoading();
    }

    function handlePageShow() {
      finishLoading();
    }

    document.addEventListener('click', handleClick, true);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('pageshow', handlePageShow);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted) return null;

  return (
    <div className={`pointer-events-none fixed inset-0 z-[1200] bg-black/38 backdrop-blur-[18px] transition-opacity duration-300 ease-out ${shown ? 'opacity-100' : 'opacity-0'}`}>
      <div className="fixed left-1/2 top-1/2 min-w-[156px] -translate-x-1/2 -translate-y-1/2 rounded-[26px] border border-[#e50914]/45 bg-black/62 px-6 py-4 text-center shadow-[0_24px_90px_rgba(0,0,0,0.66),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl">
        <p className="text-sm font-black lowercase tracking-[0.08em] text-[#e50914] drop-shadow-[0_0_18px_rgba(229,9,20,0.52)] md:text-base">
          loading…{progress}%
        </p>
      </div>
    </div>
  );
}
