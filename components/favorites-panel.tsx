'use client';

import { useEffect, useState } from 'react';
import type { MovieItem } from '@/lib/tmdb';
import { getStoredSession } from '@/lib/supabase-auth-browser';

type FavoriteRecord = {
  id: string;
  media_type: string;
  media_id: number;
  title: string;
  poster?: string | null;
  backdrop?: string | null;
  created_at?: string | null;
};

const fallbackImage = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80';

function detailHref(item: FavoriteRecord) {
  return `/${item.media_type === 'tv' ? 'tv' : 'movie'}/${item.media_id}`;
}

function toMovieItem(item: FavoriteRecord): MovieItem {
  const poster = item.poster || item.backdrop || fallbackImage;
  const backdrop = item.backdrop || item.poster || fallbackImage;

  return {
    id: item.media_id,
    mediaType: item.media_type === 'tv' ? 'tv' : 'movie',
    title: item.title,
    overview: 'รายการโปรดของคุณ กดรายละเอียดเพื่อดูข้อมูลเพิ่มเติม',
    posterUrl: poster,
    backdropUrl: backdrop,
    rating: 0,
    year: item.created_at ? new Date(item.created_at).getFullYear().toString() : '',
    genres: ['Favorite'],
    language: 'en',
    status: 'published',
    label: 'Favorite',
    badges: ['favorite'],
  };
}

export function FavoritesPanel() {
  const [items, setItems] = useState<FavoriteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const session = getStoredSession();
  const token = session?.access_token;

  async function loadFavorites() {
    setLoading(true);
    setMessage('');

    try {
      if (!token) {
        setItems([]);
        setMessage('เข้าสู่ระบบก่อนเพื่อดูรายการโปรดของคุณ');
        return;
      }

      const response = await fetch('/api/favorites', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลดรายการโปรดไม่ได้');
      setItems(payload.items || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดรายการโปรดไม่ได้');
    } finally {
      setLoading(false);
    }
  }

  async function removeFavorite(item: FavoriteRecord) {
    if (!token) return;
    setMessage('');

    try {
      const response = await fetch(`/api/favorites?mediaType=${encodeURIComponent(item.media_type)}&mediaId=${item.media_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'ลบไม่ได้');
      setItems((current) => current.filter((record) => record.id !== item.id));
      setMessage('ลบออกจากรายการโปรดแล้ว');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ลบไม่ได้');
    }
  }

  useEffect(() => {
    void loadFavorites();
  }, [token]);

  if (!token) {
    return (
      <div className="mt-8 rounded-[28px] border border-[#e50914]/30 bg-[#170203]/65 p-5">
        <p className="text-lg font-black tracking-[-0.03em]">ยังไม่ได้เข้าสู่ระบบ</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/48">เข้าสู่ระบบก่อนเพื่อบันทึกและดูรายการโปรดข้ามอุปกรณ์</p>
        <a href="/auth?mode=signin" className="mt-5 inline-flex rounded-2xl bg-[#e50914] px-5 py-3 text-sm font-black text-white shadow-glow">
          เข้าสู่ระบบ
        </a>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-black text-white/72">ทั้งหมด {items.length} เรื่อง</p>
        <button type="button" onClick={loadFavorites} className="text-xs font-black text-[#e50914] hover:text-red-300">
          รีเฟรช
        </button>
      </div>

      {message ? <p className="mb-4 rounded-2xl bg-white/[0.055] px-4 py-3 text-xs font-bold text-white/58">{message}</p> : null}

      {loading ? (
        <div className="rounded-[28px] bg-white/[0.045] p-6 text-sm font-black text-white/50">กำลังโหลดรายการโปรด...</div>
      ) : items.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => {
            return (
              <article key={item.id} className="group overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.045] shadow-[0_18px_70px_rgba(0,0,0,0.42)]">
                <a href={detailHref(item)} className="block w-full text-left">
                  <div className="aspect-[2/3] bg-black/50">
                    {item.poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.poster} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="grid h-full place-items-center text-xs font-black text-white/28">NO POSTER</div>
                    )}
                  </div>
                  <div className="p-3 pb-0">
                    <p className="line-clamp-2 min-h-[38px] text-sm font-black leading-5 tracking-[-0.025em]">{item.title}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/36">{item.media_type} • {item.media_id}</p>
                  </div>
                </a>
                <div className="p-3 pt-0">
                  <button type="button" onClick={() => removeFavorite(item)} className="mt-3 text-xs font-black text-[#e50914] hover:text-red-300">
                    ลบออก
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-lg font-black tracking-[-0.03em]">ยังไม่มีรายการโปรด</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/48">หลังจากต่อปุ่ม + รายการโปรด ในหน้ารายละเอียด หนังที่บันทึกจะมาอยู่ตรงนี้</p>
        </div>
      )}

    </div>
  );
}
