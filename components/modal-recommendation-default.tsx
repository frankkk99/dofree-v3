'use client';

import { useEffect } from 'react';

function visible(element: HTMLElement) {
  return element.offsetParent !== null || element.getClientRects().length > 0;
}

function tabText(button: HTMLButtonElement) {
  return button.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function isRecommendPanelOpen(root: ParentNode) {
  return Array.from(root.querySelectorAll('h3')).some((heading) => {
    if (!(heading instanceof HTMLElement)) return false;
    return heading.textContent?.trim() === 'แนะนำสำหรับคุณ' && visible(heading);
  });
}

function isActorPanelOpen(root: ParentNode) {
  return Array.from(root.querySelectorAll('h3')).some((heading) => {
    if (!(heading instanceof HTMLElement)) return false;
    return heading.textContent?.trim() === 'นักแสดงหลัก' && visible(heading);
  });
}

function syncMovieModalRecommendations() {
  for (const rail of Array.from(document.querySelectorAll('.movie-rail'))) {
    if (!(rail instanceof HTMLElement)) continue;

    const buttons = Array.from(rail.querySelectorAll('button')).filter((button): button is HTMLButtonElement => button instanceof HTMLButtonElement);
    const castButton = buttons.find((button) => tabText(button) === 'นักแสดง');
    const recommendButton = buttons.find((button) => tabText(button) === 'แนะนำ');

    if (castButton) {
      castButton.style.display = 'none';
      castButton.setAttribute('aria-hidden', 'true');
      castButton.tabIndex = -1;
    }

    if (!recommendButton) continue;

    const modal = rail.closest('[role="dialog"]') || document;
    const shouldOpenRecommend = isActorPanelOpen(modal) || !isRecommendPanelOpen(modal);

    if (shouldOpenRecommend && visible(recommendButton)) {
      recommendButton.click();
    }
  }
}

export function ModalRecommendationDefault() {
  useEffect(() => {
    let frame = 0;

    function scheduleSync() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncMovieModalRecommendations);
    }

    scheduleSync();

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });

    window.addEventListener('click', scheduleSync, true);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('click', scheduleSync, true);
    };
  }, []);

  return null;
}
