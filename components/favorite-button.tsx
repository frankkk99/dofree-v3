'use client';

import { useEffect, useMemo, useState } from 'react';
import { getValidSession } from '@/lib/supabase-auth-browser';
import type { MediaType } from '@/lib/tmdb';

type FavoriteButtonProps = {
  mediaType: MediaType;
  mediaId: number;
  title: string;
  poster?: string | null;
  backdrop?: string | null;
  className?: string;
};

type StoredFavorite = {
  mediaType: MediaType;
  mediaId: number;
  title: string;
  poster?: string | null;
  backdrop?: string | null;
  savedAt: string;
};

const storageKey = 'dofree_favorites_v1';

function favoriteKey(mediaType: MediaType, mediaId: number) {
  return `${mediaType}:${mediaId}`;
}

function readStoredFavorites() {
  if (typeof window === 'undefined') return [] as StoredFavorite[];
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as StoredFavorite[] : [];
  } catch {
    return [] as StoredFavorite[];
  }
}

function writeStoredFavorites(items: StoredFavorite[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(items));
}

function isStoredFavorite(mediaType: MediaType, mediaId: number) {
  const key = favoriteKey(mediaType, mediaId);
  return readStoredFavorites().some((item) => favoriteKey(item.mediaType, item.mediaId) === key);
}

function saveLocalFavorite(item: StoredFavorite) {
  const key = favoriteKey(item.mediaType, item.mediaId);
  const current = readStoredFavorites().filter((favorite) => favoriteKey(favorite.mediaType, favorite.mediaId) !== key);
  writeStoredFavorites([item, ...current].slice(0, 200));
}

function removeLocalFavorite(mediaType: MediaType, mediaId: number) {
  const key = favoriteKey(mediaType, mediaId);
  writeStoredFavorites(readStoredFavorites().filter((favorite) => favoriteKey(favorite.mediaType, favorite.mediaId) !== key));
}

export function FavoriteButton({ mediaType, mediaId, title, poster, backdrop, className = '' }: FavoriteButtonProps) {
  const [active, setActive] = useState(false);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');
  const localItem = useMemo<StoredFavorite>(() => ({ mediaType, mediaId, title, poster, backdrop, savedAt: new Date().toISOString() }), [backdrop, mediaId, mediaType, poster, title]);

  useEffect(() => {
    let cancelled = false;
    const localActive = isStoredFavorite(mediaType, mediaId);
    setActive(localActive);

    async function checkRemote() {
      const session = await getValidSession().catch(() => null);
      if (!session?.access_token) return;
      const params = new URLSearchParams({ mediaType, mediaId: String(mediaId) });
      const response = await fetch(`/api/favorites?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      }).catch(() => null);
      if (!response?.ok) return;
      const payload = await response.json().catch(() => null);
      if (!cancelled && Array.isArray(payload?.items)) {
        const remoteActive = payload.items.some((item: { media_type?: string; media_id?: number }) => item.media_type === mediaType && Number(item.media_id) === mediaId);
        setActive(remoteActive || localActive);
      }
    }

    void checkRemote();
    return () => { cancelled = true; };
  }, [mediaId, mediaType]);

  async function syncRemote(nextActive: boolean) {
    const session = await getValidSession().catch(() => null);
    if (!session?.access_token) return false;

    if (nextActive) {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mediaType, mediaId, title, poster, backdrop }),
      });
      return response.ok;
    }

    const params = new URLSearchParams({ mediaType, mediaId: String(mediaId) });
    const response = await fetch(`/api/favorites?${params.toString()}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    return response.ok;
  }

  async function toggleFavorite() {
    if (working) return;
    const nextActive = !active;
    setWorking(true);
    setNotice('');
    setActive(nextActive);

    if (nextActive) {
      saveLocalFavorite({ ...localItem, savedAt: new Date().toISOString() });
    } else {
      removeLocalFavorite(mediaType, mediaId);
    }

    const synced = await syncRemote(nextActive).catch(() => false);
    setNotice(nextActive ? (synced ? 'เพิ่มในรายการโปรดแล้ว' : 'บันทึกในเครื่องนี้แล้ว') : 'นำออกจากรายการโปรดแล้ว');
    window.setTimeout(() => setNotice(''), 1800);
    setWorking(false);
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => void toggleFavorite()}
        disabled={working}
        aria-pressed={active}
        className={`${className || 'inline-flex h-8 items-center rounded-lg bg-white/[0.1] px-3 text-[11px] font-black text-white/82 backdrop-blur-xl transition hover:bg-white/[0.16] md:h-9 md:px-4 md:text-xs'} ${active ? 'ring-1 ring-[#e50914]/55 text-white' : ''}`}
      >
        {active ? '✓ อยู่ในรายการโปรด' : '+ รายการโปรด'}
      </button>
      {notice ? <span className="absolute left-0 top-full z-30 mt-2 min-w-max rounded-full bg-black/88 px-3 py-1.5 text-[10px] font-black text-white/78 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">{notice}</span> : null}
    </div>
  );
}
