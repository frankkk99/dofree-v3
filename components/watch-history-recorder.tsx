'use client';

import { useEffect } from 'react';
import type { MovieItem } from '@/lib/tmdb';
import { getStoredSession } from '@/lib/supabase-auth-browser';

function historyKey(item: MovieItem) {
  return `watch-history-recorded:${item.mediaType}:${item.id}`;
}

export function WatchHistoryRecorder({ item }: { item: MovieItem }) {
  useEffect(() => {
    const session = getStoredSession();
    const token = session?.access_token;
    if (!token) return;

    const key = historyKey(item);
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');

    void fetch('/api/watch-history', {
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
        durationSeconds: item.runtime ? item.runtime * 60 : undefined,
      }),
    }).catch(() => {
      window.sessionStorage.removeItem(key);
    });
  }, [item.id, item.mediaType, item.posterUrl, item.runtime, item.title]);

  return null;
}
