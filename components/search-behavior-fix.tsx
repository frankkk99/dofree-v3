'use client';

import { useEffect } from 'react';

const RELEASE_HOST_ID = 'realtime-added-host';
const SORTED_MARK = 'data-dofree-rating-sorted';

function isVisible(element: HTMLElement) {
  return element.offsetParent !== null || element.getClientRects().length > 0;
}

function ratingFromCard(card: HTMLElement) {
  const text = card.textContent || '';
  const match = text.match(/★\s*(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function titleFromCard(card: HTMLElement) {
  const title = card.querySelector('h3')?.textContent?.trim();
  return title || card.getAttribute('aria-label') || '';
}

function sortCardGrid(grid: HTMLElement) {
  const cards = Array.from(grid.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
  if (cards.length < 2) return;

  const sorted = [...cards].sort((a, b) => {
    const ratingDiff = ratingFromCard(b) - ratingFromCard(a);
    if (ratingDiff !== 0) return ratingDiff;
    return titleFromCard(a).localeCompare(titleFromCard(b), 'th');
  });

  const alreadySorted = cards.every((card, index) => card === sorted[index]);
  if (alreadySorted) return;

  for (const card of sorted) grid.appendChild(card);
  grid.setAttribute(SORTED_MARK, 'true');
}

function resultFilterIsActive() {
  const sections = document.getElementById('sections');
  if (!sections) return false;

  const visibleClearButton = Array.from(document.querySelectorAll('button')).some((button) => {
    if (!(button instanceof HTMLElement)) return false;
    return button.textContent?.trim() === 'ล้างค่า' && isVisible(button);
  });

  const resultHeading = Array.from(sections.querySelectorAll('h2')).some((heading) => {
    const text = heading.textContent?.trim() || '';
    return text.startsWith('ค้นหา') || text === 'ทั้งหมด' || text.length > 0 && Boolean(sections.querySelector('[style*="780px"]'));
  });

  return visibleClearButton || resultHeading;
}

function syncReleaseSection(hidden: boolean) {
  const host = document.getElementById(RELEASE_HOST_ID);
  if (host instanceof HTMLElement) host.style.display = hidden ? 'none' : '';
}

function sortActiveResults() {
  const filterMode = resultFilterIsActive();
  syncReleaseSection(filterMode);

  if (!filterMode) return;

  const sections = document.getElementById('sections');
  if (sections) {
    for (const grid of Array.from(sections.querySelectorAll('.grid'))) {
      if (grid instanceof HTMLElement) sortCardGrid(grid);
    }
  }

  for (const overlayGrid of Array.from(document.querySelectorAll('.fixed.inset-0 .grid'))) {
    if (overlayGrid instanceof HTMLElement) sortCardGrid(overlayGrid);
  }
}

export function SearchBehaviorFix() {
  useEffect(() => {
    let frame = 0;

    function scheduleSort() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(sortActiveResults);
    }

    scheduleSort();

    const observer = new MutationObserver(scheduleSort);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });

    window.addEventListener('input', scheduleSort, true);
    window.addEventListener('click', scheduleSort, true);
    window.addEventListener('popstate', scheduleSort);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('input', scheduleSort, true);
      window.removeEventListener('click', scheduleSort, true);
      window.removeEventListener('popstate', scheduleSort);
      syncReleaseSection(false);
    };
  }, []);

  return null;
}
