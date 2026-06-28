'use client';

import { useEffect, useMemo, useState } from 'react';
import type { HomePayload, MovieItem } from '@/lib/tmdb';
import { canUsePremiumFeature } from '@/lib/premium-access-config';
import { usePremiumAccessSnapshot } from '@/lib/premium-access-client';
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

export function FavoriteClickBridge({ home }: { home: HomePayload }) {
  const items = useMemo(() => allHomeItems(home), [home]);
  const [message, setMessage] = useState('');
  const { config: premiumAccessConfig, userState: premiumUserState } = usePremiumAccessSnapshot();

  useEffect(() => {
    let timer: number | null = null;

    function showMessage(value: string) {
      setMessage(value);
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setMessage(''), 2300);
    }

    async function saveFavorite(item: MovieItem) {
      const session = getStoredSession();
      const token = session?.access_token;
      if (!token) {
        showMessage('เข้าสู่ระบบก่อนเพื่อบันทึกรายการโปรด');
        window.setTimeout(() => {
          window.location.href = '/auth?mode=signin';
        }, 650);
        return;
      }

      if (!canUsePremiumFeature('favorites', premiumUserState, premiumAccessConfig)) {
        showMessage('รายการโปรดเป็นฟีเจอร์ Premium');
        window.setTimeout(() => {
          window.location.href = '/membership';
        }, 650);
        return;
      }

      const response = await fetch('/api/favorites', {
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
          backdrop: item.backdropUrl,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'บันทึกรายการโปรดไม่ได้');
      showMessage('เพิ่มในรายการโปรดแล้ว');
    }

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('button');
      if (!button?.textContent?.includes('รายการโปรด')) return;

      const title = modalTitle();
      const item = findByTitle(items, title);
      if (!item) return;

      event.preventDefault();
      event.stopPropagation();
      void saveFavorite(item).catch((error) => showMessage(error instanceof Error ? error.message : 'บันทึกรายการโปรดไม่ได้'));
    }

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      if (timer) window.clearTimeout(timer);
    };
  }, [items, premiumAccessConfig, premiumUserState]);

  if (!message) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-[1200] -translate-x-1/2 rounded-full bg-[#e50914] px-5 py-3 text-xs font-black text-white shadow-[0_18px_70px_rgba(229,9,20,0.45)]">
      {message}
    </div>
  );
}
