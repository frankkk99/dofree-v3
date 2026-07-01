'use client';

import type { MouseEvent, ReactNode } from 'react';

type Props = {
  href: string;
  className?: string;
  children: ReactNode;
  loadPlayer?: boolean;
};

export function DetailSmoothAnchor({ href, className = '', children, loadPlayer = false }: Props) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!href.startsWith('#')) return;
    event.preventDefault();

    const target = document.getElementById(href.slice(1));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${href}`);
    }

    if (loadPlayer) {
      window.setTimeout(() => window.dispatchEvent(new Event('dofree-load-player')), 200);
    }
  }

  return <a href={href} onClick={handleClick} data-no-route-loader="true" className={className}>{children}</a>;
}
