'use client';

import { useEffect, useMemo, useState } from 'react';
import type { HomePayload, MovieItem } from '@/lib/tmdb';
import { DetailWindow } from '@/components/window-system';

function unique(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(`${item.mediaType}-${item.id}`, item);
  return [...map.values()];
}

function baseHomeItems(home: HomePayload) {
  return unique([
    home.hero,
    ...(home.heroItems || []),
    ...home.sections.flatMap((section) => section.items),
  ]);
}

function itemKey(mediaType: string, id: string | number) {
  return `${mediaType}-${Number(id)}`;
}

function parseMovieHref(href: string) {
  try {
    const url = new URL(href, window.location.origin);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length !== 2) return null;
    const [mediaType, id] = parts;
    if (mediaType !== 'movie' && mediaType !== 'tv') return null;
    const mediaId = Number(id);
    if (!mediaId) return null;
    return { mediaType, id: mediaId };
  } catch {
    return null;
  }
}

export function HomeCardLinkBridge({ home }: { home: HomePayload }) {
  const [liveItems, setLiveItems] = useState<MovieItem[]>([]);
  const [selected, setSelected] = useState<MovieItem | null>(null);
  const items = useMemo(() => unique([...baseHomeItems(home), ...liveItems]), [home, liveItems]);
  const itemMap = useMemo(() => new Map(items.map((item) => [itemKey(item.mediaType, item.id), item])), [items]);
  const recommendations = selected
    ? items.filter((item) => itemKey(item.mediaType, item.id) !== itemKey(selected.mediaType, selected.id)).slice(0, 24)
    : items.slice(0, 24);

  useEffect(() => {
    let active = true;

    async function loadRecent() {
      try {
        const response = await fetch('/api/catalog/recent', { cache: 'no-store' });
        const payload = (await response.json()) as { ok?: boolean; items?: MovieItem[] };
        if (active && payload.ok && payload.items?.length) setLiveItems(payload.items);
      } catch {
        // Keep base home data if realtime feed is unavailable.
      }
    }

    void loadRecent();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest('a');
      if (!link) return;

      const parsed = parseMovieHref(link.getAttribute('href') || '');
      if (!parsed) return;

      const item = itemMap.get(itemKey(parsed.mediaType, parsed.id));
      if (!item) return;

      event.preventDefault();
      event.stopPropagation();
      setSelected(item);
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [itemMap]);

  return selected ? (
    <DetailWindow
      item={selected}
      recommendations={recommendations}
      onClose={() => setSelected(null)}
      onSelect={setSelected}
    />
  ) : null;
}
