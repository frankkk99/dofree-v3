'use client';

import { useEffect } from 'react';

const HEADER_SELECTOR = 'main > header';
const SCROLL_STOP_DELAY_MS = 260;
const TOP_SAFE_ZONE_PX = 12;

function applyHeaderState(header: HTMLElement, visible: boolean) {
  header.style.willChange = 'transform, opacity, filter';
  header.style.transition = 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 420ms ease, filter 520ms ease';
  header.style.transform = visible ? 'translate3d(0, 0, 0)' : 'translate3d(0, -112%, 0)';
  header.style.opacity = visible ? '1' : '0.08';
  header.style.filter = visible ? 'none' : 'blur(10px)';
  header.style.pointerEvents = visible ? 'auto' : 'none';
  header.dataset.scrollHeaderState = visible ? 'visible' : 'hidden';
}

function findHeader() {
  return document.querySelector(HEADER_SELECTOR) as HTMLElement | null;
}

export function AutoHideHeader() {
  useEffect(() => {
    let stopTimer = 0;
    let frame = 0;
    let visible = true;
    let lastScrollY = window.scrollY;

    function setVisible(nextVisible: boolean) {
      if (visible === nextVisible) return;
      visible = nextVisible;
      const header = findHeader();
      if (header) applyHeaderState(header, visible);
    }

    function showNow() {
      window.clearTimeout(stopTimer);
      setVisible(true);
    }

    function scheduleShowAfterStop() {
      window.clearTimeout(stopTimer);
      stopTimer = window.setTimeout(() => setVisible(true), SCROLL_STOP_DELAY_MS);
    }

    function onScroll() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = Math.abs(currentY - lastScrollY);
        lastScrollY = currentY;

        if (document.body.style.overflow === 'hidden') {
          showNow();
          return;
        }

        if (currentY <= TOP_SAFE_ZONE_PX) {
          showNow();
          return;
        }

        if (delta > 1) {
          setVisible(false);
          scheduleShowAfterStop();
        }
      });
    }

    function onPointerNearTop(event: PointerEvent) {
      if (event.clientY <= 96) showNow();
    }

    function initialise() {
      const header = findHeader();
      if (header) applyHeaderState(header, true);
    }

    initialise();

    const observer = new MutationObserver(initialise);
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', showNow);
    window.addEventListener('pointermove', onPointerNearTop, { passive: true });
    window.addEventListener('focus', showNow);

    return () => {
      window.clearTimeout(stopTimer);
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', showNow);
      window.removeEventListener('pointermove', onPointerNearTop);
      window.removeEventListener('focus', showNow);

      const header = findHeader();
      if (header) {
        header.style.willChange = '';
        header.style.transition = '';
        header.style.transform = '';
        header.style.opacity = '';
        header.style.filter = '';
        header.style.pointerEvents = '';
        delete header.dataset.scrollHeaderState;
      }
    };
  }, []);

  return null;
}
