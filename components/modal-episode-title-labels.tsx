'use client';

import { useEffect } from 'react';

export function ModalEpisodeTitleLabels() {
  useEffect(() => {
    function applyLabels() {
      const anchors = Array.from(document.querySelectorAll('a[title]')) as HTMLAnchorElement[];
      anchors.forEach((anchor) => {
        const text = anchor.textContent?.trim() || '';
        const title = anchor.title.trim();
        if (!/^S\d+E\d+$/i.test(text)) return;
        if (!title || /^EP\s*\d+$/i.test(title)) return;
        anchor.textContent = `${text} · ${title}`;
        anchor.classList.add('min-w-[120px]', 'text-left');
        anchor.setAttribute('aria-label', `${text} ${title}`);
      });
    }

    applyLabels();
    const observer = new MutationObserver(applyLabels);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
