'use client';

import { useEffect } from 'react';

const SEARCH_PLACEHOLDER = 'ค้นหาหนัง ซีรีส์ หมวดหมู่ หรือเลือกชิปด้านล่าง';

function applyGlassStyle(element: HTMLElement, level: 'panel' | 'card' | 'field') {
  element.style.borderColor = level === 'panel' ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.16)';
  element.style.webkitBackdropFilter = level === 'panel' ? 'blur(34px) saturate(150%)' : 'blur(24px) saturate(140%)';
  element.style.backdropFilter = level === 'panel' ? 'blur(34px) saturate(150%)' : 'blur(24px) saturate(140%)';

  if (level === 'panel') {
    element.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.10) 36%, rgba(20,20,20,0.48) 100%)';
    element.style.boxShadow = '0 34px 120px rgba(0,0,0,0.82), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(255,255,255,0.08)';
  }

  if (level === 'card') {
    element.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 48%, rgba(0,0,0,0.30) 100%)';
    element.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.12), 0 12px 44px rgba(0,0,0,0.36)';
  }

  if (level === 'field') {
    element.style.background = 'rgba(0,0,0,0.22)';
    element.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.10)';
  }
}

function polishFloatingSearchUi() {
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

  const panels = Array.from(document.querySelectorAll('div')).filter((element): element is HTMLElement => {
    if (!(element instanceof HTMLElement)) return false;
    const text = element.textContent || '';
    const className = typeof element.className === 'string' ? element.className : '';
    return className.includes('rounded-[30px]') && text.includes('Quick Filters') && text.includes('ลากปุ่มค้นหา');
  });

  for (const panel of panels) {
    applyGlassStyle(panel, 'panel');

    const form = panel.querySelector('form');
    if (form instanceof HTMLElement) {
      applyGlassStyle(form, 'card');
      const field = form.querySelector('div');
      if (field instanceof HTMLElement) applyGlassStyle(field, 'field');
    }

    const quickFilterCard = Array.from(panel.children).find((child): child is HTMLElement => (
      child instanceof HTMLElement && child.textContent?.includes('Quick Filters')
    ));
    if (quickFilterCard) applyGlassStyle(quickFilterCard, 'card');
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
