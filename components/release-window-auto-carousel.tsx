'use client';

import { useEffect } from 'react';

const TARGET_TITLE = 'หนังเข้าใหม่ / กำลังจะเข้า';
const AUTO_SPEED = 72;
const RESUME_DELAY = 1200;

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

      let pausedUntil = 0;
      let frame = 0;
      let lastFrame = 0;

      function pauseBriefly() {
        pausedUntil = performance.now() + RESUME_DELAY;
      }

      function tick(now: number) {
        const last = lastFrame || now;
        const delta = Math.min(now - last, 64);
        lastFrame = now;

        const canScroll = rail.scrollWidth > rail.clientWidth + 8;
        const isPaused = now < pausedUntil;

        if (canScroll && !isPaused) {
          rail.scrollLeft += (AUTO_SPEED * delta) / 1000;
          const maxScroll = rail.scrollWidth - rail.clientWidth;
          if (rail.scrollLeft >= maxScroll - 4) {
            rail.scrollLeft = 0;
          }
        }

        frame = window.requestAnimationFrame(tick);
      }

      rail.addEventListener('pointerdown', pauseBriefly, { passive: true });
      rail.addEventListener('touchstart', pauseBriefly, { passive: true });
      rail.addEventListener('wheel', pauseBriefly, { passive: true });
      frame = window.requestAnimationFrame(tick);

      cleanupMap.set(rail, () => {
        window.cancelAnimationFrame(frame);
        rail.removeEventListener('pointerdown', pauseBriefly);
        rail.removeEventListener('touchstart', pauseBriefly);
        rail.removeEventListener('wheel', pauseBriefly);
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
