'use client';

import { useEffect } from 'react';

const TARGET_TITLE = 'หนังเข้าใหม่ / กำลังจะเข้า';
const AUTO_SPEED = 24;
const RESUME_DELAY = 1800;

function findReleaseRails() {
  const headings = Array.from(document.querySelectorAll('h2'));
  return headings
    .filter((heading) => heading.textContent?.includes(TARGET_TITLE))
    .map((heading) => {
      const section = heading.closest('section') || heading.closest('#sections') || heading.parentElement;
      return section?.querySelector('.movie-rail') as HTMLElement | null;
    })
    .filter((rail): rail is HTMLElement => Boolean(rail));
}

export function ReleaseWindowAutoCarousel() {
  useEffect(() => {
    const cleanups = new Map<HTMLElement, () => void>();

    function attach(rail: HTMLElement) {
      if (cleanups.has(rail)) return;
      if (rail.scrollWidth <= rail.clientWidth) return;

      rail.dataset.releaseWindowAutoCarousel = 'true';
      rail.setAttribute('aria-label', 'หนังเข้าใหม่ / กำลังจะเข้า เลื่อนอัตโนมัติ');

      let paused = false;
      let frame = 0;
      let resumeTimer = 0;
      let lastFrame = 0;

      function pauseBriefly() {
        paused = true;
        if (resumeTimer) window.clearTimeout(resumeTimer);
        resumeTimer = window.setTimeout(() => {
          lastFrame = 0;
          paused = false;
        }, RESUME_DELAY);
      }

      function tick(now: number) {
        const last = lastFrame || now;
        const delta = Math.min(now - last, 64);
        lastFrame = now;

        if (!paused && rail.scrollWidth > rail.clientWidth) {
          rail.scrollLeft += (AUTO_SPEED * delta) / 1000;
          const maxScroll = rail.scrollWidth - rail.clientWidth;
          if (rail.scrollLeft >= maxScroll - 2) rail.scrollLeft = 0;
        }

        frame = window.requestAnimationFrame(tick);
      }

      rail.addEventListener('pointerdown', pauseBriefly, { passive: true });
      rail.addEventListener('touchstart', pauseBriefly, { passive: true });
      rail.addEventListener('wheel', pauseBriefly, { passive: true });
      rail.addEventListener('mouseenter', pauseBriefly, { passive: true });
      frame = window.requestAnimationFrame(tick);

      cleanups.set(rail, () => {
        window.cancelAnimationFrame(frame);
        if (resumeTimer) window.clearTimeout(resumeTimer);
        rail.removeEventListener('pointerdown', pauseBriefly);
        rail.removeEventListener('touchstart', pauseBriefly);
        rail.removeEventListener('wheel', pauseBriefly);
        rail.removeEventListener('mouseenter', pauseBriefly);
        delete rail.dataset.releaseWindowAutoCarousel;
      });
    }

    function refresh() {
      for (const rail of findReleaseRails()) attach(rail);
    }

    const refreshTimer = window.setInterval(refresh, 1200);
    const observer = new MutationObserver(refresh);
    refresh();
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearInterval(refreshTimer);
      observer.disconnect();
      for (const cleanup of cleanups.values()) cleanup();
      cleanups.clear();
    };
  }, []);

  return null;
}
