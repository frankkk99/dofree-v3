'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const loadingMessages = [
  'กำลังโหลดหน้าใหม่',
  'กำลังดาวน์โหลดข้อมูล',
  'กำลังเตรียมภาพและการ์ดหนัง',
  'กำลังจัดหน้าให้พร้อมรับชม',
];

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function shouldIgnoreUrl(url: URL) {
  if (url.origin !== window.location.origin) return true;
  if (url.pathname === window.location.pathname && url.search === window.location.search) return true;
  return false;
}

export function RouteTransitionLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const activeRef = useRef(false);
  const startedAtRef = useRef(0);
  const hideTimerRef = useRef<number | null>(null);
  const maxTimerRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const messageTimerRef = useRef<number | null>(null);

  function clearTimers() {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    if (maxTimerRef.current) window.clearTimeout(maxTimerRef.current);
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    if (messageTimerRef.current) window.clearInterval(messageTimerRef.current);
    hideTimerRef.current = null;
    maxTimerRef.current = null;
    progressTimerRef.current = null;
    messageTimerRef.current = null;
  }

  function startLoading(startAt = 8) {
    clearTimers();
    activeRef.current = true;
    startedAtRef.current = Date.now();
    setVisible(true);
    setProgress(startAt);
    setMessageIndex(0);

    progressTimerRef.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) return current;
        const step = current < 35 ? 7 : current < 68 ? 4 : current < 84 ? 2 : 1;
        return clampProgress(current + step);
      });
    }, 180);

    messageTimerRef.current = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % loadingMessages.length);
    }, 760);

    maxTimerRef.current = window.setTimeout(() => {
      finishLoading();
    }, 4200);
  }

  function finishLoading() {
    if (!activeRef.current) return;
    activeRef.current = false;
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    if (messageTimerRef.current) window.clearInterval(messageTimerRef.current);
    if (maxTimerRef.current) window.clearTimeout(maxTimerRef.current);
    progressTimerRef.current = null;
    messageTimerRef.current = null;
    maxTimerRef.current = null;
    setProgress(100);

    const elapsed = Date.now() - startedAtRef.current;
    const delay = Math.max(220, 560 - elapsed);
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
      setMessageIndex(0);
    }, delay);
  }

  useEffect(() => {
    finishLoading();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (isModifiedClick(event)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      try {
        const url = new URL(anchor.href, window.location.href);
        if (shouldIgnoreUrl(url)) return;
        startLoading(6);
      } catch {}
    }

    function handlePopState() {
      startLoading(10);
    }

    function handlePageShow() {
      finishLoading();
    }

    document.addEventListener('click', handleClick, true);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pageshow', handlePageShow);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[1200] grid place-items-center bg-black/34 px-5 text-white backdrop-blur-[10px]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(229,9,20,0.28),transparent_18rem),radial-gradient(circle_at_20%_90%,rgba(255,255,255,0.08),transparent_18rem)]" />
      <div className="relative w-full max-w-[330px] overflow-hidden rounded-[32px] border border-white/15 bg-white/[0.08] p-5 text-center shadow-[0_36px_120px_rgba(0,0,0,0.78),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-42px_90px_rgba(0,0,0,0.34)] backdrop-blur-3xl md:max-w-[380px] md:p-6">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_44%,rgba(229,9,20,0.16))]" />
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-[#e50914]">DooDeeDee</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.06em] text-white md:text-3xl">กำลังโหลด</h2>
          <p className="mt-2 min-h-5 text-xs font-bold text-white/56">{loadingMessages[messageIndex]}</p>

          <div className="mx-auto mt-5 grid h-24 w-24 place-items-center rounded-full border border-white/12 bg-black/38 shadow-[inset_0_0_34px_rgba(229,9,20,0.22),0_22px_70px_rgba(0,0,0,0.42)] md:h-28 md:w-28">
            <div className="text-center">
              <p className="text-3xl font-black tracking-[-0.08em] text-white md:text-4xl">{progress}%</p>
              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/36">Download</p>
            </div>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="h-full rounded-full bg-[#e50914] shadow-[0_0_24px_rgba(229,9,20,0.62)] transition-[width] duration-200 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-[10px] font-bold text-white/36">กรุณารอสักครู่ ระบบกำลังเปลี่ยนหน้า</p>
        </div>
      </div>
    </div>
  );
}
