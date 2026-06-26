'use client';

import { useEffect } from 'react';

const SEARCH_PLACEHOLDER = 'ค้นหาหนัง ซีรีส์ หมวดหมู่ หรือเลือกชิปด้านล่าง';

function polishFloatingSearchUi() {
  for (const button of Array.from(document.querySelectorAll('button'))) {
    if (!(button instanceof HTMLButtonElement)) continue;
    if (button.textContent?.trim() === 'ล้างค่า') {
      button.style.display = 'none';
      button.setAttribute('aria-hidden', 'true');
      button.tabIndex = -1;
    }
  }

  for (const element of Array.from(document.querySelectorAll('p, h2'))) {
    if (!(element instanceof HTMLElement)) continue;
    const text = element.textContent?.trim();
    if (text === 'Glass Search' || text === 'ค้นหาเร็ว' || text === SEARCH_PLACEHOLDER) {
      element.style.display = 'none';
      element.setAttribute('aria-hidden', 'true');
    }
  }

  for (const input of Array.from(document.querySelectorAll('input'))) {
    if (!(input instanceof HTMLInputElement)) continue;
    if (input.placeholder === 'พิมพ์ชื่อหนัง หรือคำค้นหา') {
      input.placeholder = SEARCH_PLACEHOLDER;
    }
  }
}

export function FloatingSearchPolish() {
  useEffect(() => {
    let frame = 0;

    function schedulePolish() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(polishFloatingSearchUi);
    }

    schedulePolish();

    const observer = new MutationObserver(schedulePolish);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return null;
}
