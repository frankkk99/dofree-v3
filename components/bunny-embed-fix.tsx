'use client';

import { useEffect } from 'react';

function sanitizeBunnyUrl(value: string) {
  try {
    const url = new URL(value);
    if (!url.hostname.includes('mediadelivery.net')) return value;

    if (url.searchParams.get('preload') === 'metadata') {
      url.searchParams.delete('preload');
    }

    return url.toString();
  } catch {
    return value;
  }
}

function sanitizeIframe(iframe: HTMLIFrameElement) {
  const currentSrc = iframe.getAttribute('src');
  if (!currentSrc) return;

  const cleanSrc = sanitizeBunnyUrl(currentSrc);
  if (cleanSrc !== currentSrc) iframe.setAttribute('src', cleanSrc);
}

function sanitizeBunnyIframes() {
  for (const iframe of Array.from(document.querySelectorAll('iframe'))) {
    if (iframe instanceof HTMLIFrameElement) sanitizeIframe(iframe);
  }
}

export function BunnyEmbedFix() {
  useEffect(() => {
    let frame = 0;

    function scheduleSanitize() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(sanitizeBunnyIframes);
    }

    scheduleSanitize();

    const observer = new MutationObserver(scheduleSanitize);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['src'] });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return null;
}
