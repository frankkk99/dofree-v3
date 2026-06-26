'use client';

import { useEffect } from 'react';

const TARGET_TITLE = 'หนังเข้าใหม่ / กำลังจะเข้า';
const AUTO_SPEED = 72;
const RESUME_DELAY = 3000;

function nearestRailFromHeading(heading: Element) {
  const blocks = [
    heading.closest('section'),
    heading.closest('[id="realtime-added-host"]'),
    heading.parentElement?.parentElement,
    heading.parentElement?.parentElement?.parentElement,
    document.getElementById('realtime-added-host'),
  ].filter(Boolean) as Element[];

  for (const block of blocks) {
    const rail = block.querySelector('.movie-rail');
    if (rail instanceof HTMLElement) return rail;
  }

  return null;
}

function findReleaseRails() {
  const rails = new Set<HTMLElement>();

  for (const heading of Array.from(document.querySelectorAll('h2'))) {
    if (!heading.textContent?.includes(TARGET_TITLE)) continue;
    const rail = nearestRailFromHeading(heading);
    if (rail) rails.add(rail);
  }

  const realtimeRail = document.querySelector('#realtime-added-host .movie-rail');
  if (realtimeRail instanceof HTMLElement) rails.add(realtimeRail);

  return [...rails];
}

export function ReleaseWindowAutoCarousel() {
  useEffect(() => {
    const cleanupMap = new Map<HTMLElement, () => void>();

    function attach(rail: HTMLElement) {
      if (cleanupMap.has(rail)) return;

      rail.dataset.releaseWindowAutoCarousel = 'true';
      rail.setAttribute('aria-label', 'หนังเข้าใหม่ / กำลังจะเข้า เลื่อนอัตโนมัติ');
      rail.style.scrollBehavior = 'auto';

      let hoverPaused = false;
      let interactionPausedUntil = 0;
      let frame = 0;
      let lastFrame = 0;
      let lastAutoScrollLeft = rail.scrollLeft;
      let internalScroll = false;

      function pauseAfterInteraction() {
        interactionPausedUntil = performance.now() + RESUME_DELAY;
      }

      function onPointerDown(event: PointerEvent) {
        pauseAfterInteraction();
        if (event.pointerType === 'mouse') return;
        hoverPaused = false;
      }

      function onMouseEnter() {
        hoverPaused = true;
      }

      function onMouseLeave() {
        hoverPaused = false;
        pauseAfterInteraction();
      }

      function onUserScroll() {
        if (internalScroll) return;
        if (Math.abs(rail.scrollLeft - lastAutoScrollLeft) < 2) return;
        pauseAfterInteraction();
      }

      function tick(now: number) {
        const last = lastFrame || now;
        const delta = Math.min(now - last, 64);
        lastFrame = now;

        const canScroll = rail.scrollWidth > rail.clientWidth + 8;
        const interactionPaused = now < interactionPausedUntil;

        if (canScroll && !hoverPaused && !interactionPaused) {
          internalScroll = true;
          rail.scrollLeft += (AUTO_SPEED * delta) / 1000;
          const maxScroll = rail.scrollWidth - rail.clientWidth;
          if (rail.scrollLeft >= maxScroll - 4) {
            rail.scrollLeft = 0;
          }
          lastAutoScrollLeft = rail.scrollLeft;
          window.setTimeout(() => {
            internalScroll = false;
          }, 0);
        }

        frame = window.requestAnimationFrame(tick);
      }

      rail.addEventListener('pointerdown', onPointerDown, { passive: true });
      rail.addEventListener('pointerup', pauseAfterInteraction, { passive: true });
      rail.addEventListener('pointercancel', pauseAfterInteraction, { passive: true });
      rail.addEventListener('touchstart', pauseAfterInteraction, { passive: true });
      rail.addEventListener('touchmove', pauseAfterInteraction, { passive: true });
      rail.addEventListener('touchend', pauseAfterInteraction, { passive: true });
      rail.addEventListener('wheel', pauseAfterInteraction, { passive: true });
      rail.addEventListener('scroll', onUserScroll, { passive: true });
      rail.addEventListener('mouseenter', onMouseEnter, { passive: true });
      rail.addEventListener('mouseleave', onMouseLeave, { passive: true });
      frame = window.requestAnimationFrame(tick);

      cleanupMap.set(rail, () => {
        window.cancelAnimationFrame(frame);
        rail.removeEventListener('pointerdown', onPointerDown);
        rail.removeEventListener('pointerup', pauseAfterInteraction);
        rail.removeEventListener('pointercancel', pauseAfterInteraction);
        rail.removeEventListener('touchstart', pauseAfterInteraction);
        rail.removeEventListener('touchmove', pauseAfterInteraction);
        rail.removeEventListener('touchend', pauseAfterInteraction);
        rail.removeEventListener('wheel', pauseAfterInteraction);
        rail.removeEventListener('scroll', onUserScroll);
        rail.removeEventListener('mouseenter', onMouseEnter);
        rail.removeEventListener('mouseleave', onMouseLeave);
        rail.style.scrollBehavior = '';
        delete rail.dataset.releaseWindowAutoCarousel;
      });
    }

    function refresh() {
      for (const rail of findReleaseRails()) attach(rail);
    }

    refresh();
    const refreshTimer = window.setInterval(refresh, 500);
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearInterval(refreshTimer);
      observer.disconnect();
      for (const cleanup of cleanupMap.values()) cleanup();
      cleanupMap.clear();
    };
  }, []);

  return null;
}
