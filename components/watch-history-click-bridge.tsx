'use client';

import { useEffect, useMemo, useState } from 'react';
import type { HomePayload, MovieItem } from '@/lib/tmdb';
import { getStoredSession } from '@/lib/supabase-auth-browser';

function unique(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(`${item.mediaType}-${item.id}`, item);
  return [...map.values()];
}

function allHomeItems(home: HomePayload) {
  return unique([
    home.hero,
    ...(home.heroItems || []),
    ...home.sections.flatMap((section) => section.items),
  ]);
}

function normalize(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function modalTitle() {
  return document.querySelector('.modal-title')?.textContent?.trim() || '';
}

function findByTitle(items: MovieItem[], title: string) {
  const normalized = normalize(title);
  if (!normalized) return null;
  return items.find((item) => normalize(item.title) === normalized || normalize(item.titleEn) === normalized) || null;
}

export function WatchHistoryClickBridge({ home }: { home: HomePayload }) {
  const items = useMemo(() => allHomeItems(home), [home]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let timer: number | null = null;

    function showMessage(value: string) {
      setMessage(value);
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setMessage(''), 1800);
    }

    async function saveHistory(item: MovieItem) {
      const session = getStoredSession();
      const token = session?.access_token;
      if (!token) return;

      const response = await fetch('/api/watch-history', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaType: item.mediaType,
          mediaId: item.id,
          title: item.title,
          poster: item.posterUrl,
          progressSeconds: 0,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'บันทึกประวัติไม่ได้');
      showMessage('บันทึกประวัติแล้ว');
    }

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('button');
      if (!button?.textContent?.includes('รับชม')) return;

      const title = modalTitle();
      const item = findByTitle(items, title);
      if (!item) return;

      void saveHistory(item).catch(() => null);
    }

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      if (timer) window.clearTimeout(timer);
    };
  }, [items]);

  if (!message) return null;

  return (
    <div className="fixed bottom-16 left-1/2 z-[1200] -translate-x-1/2 rounded-full bg-white/[0.12] px-5 py-3 text-xs font-black text-white shadow-[0_18px_70px_rgba(0,0,0,0.50)] backdrop-blur-xl">
      {message}
    </div>
  );
}
