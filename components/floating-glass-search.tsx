'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { HomePayload } from '@/lib/tmdb';

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.15">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function FloatingGlassSearch({ home: _home }: { home: HomePayload }) {
  const [headerHost, setHeaderHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    function findHeaderHost() {
      const menuHost = document.querySelector('[data-dofree-menu-host="true"]') as HTMLElement | null;
      const parent = menuHost?.parentElement || null;
      if (parent) {
        setHeaderHost(parent);
        if (timer) window.clearInterval(timer);
      }
    }

    timer = window.setInterval(findHeaderHost, 800);
    findHeaderHost();
    return () => { if (timer) window.clearInterval(timer); };
  }, []);

  return headerHost ? createPortal(
    <a
      href="/search"
      aria-label="ไปหน้าค้นหา"
      className="order-[-2] grid h-10 w-10 place-items-center rounded-full bg-transparent text-white/90 transition hover:bg-white/10 hover:text-white md:h-12 md:w-12"
    >
      <SearchIcon />
    </a>,
    headerHost,
  ) : null;
}
