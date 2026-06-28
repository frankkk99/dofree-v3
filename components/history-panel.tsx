'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MovieItem } from '@/lib/tmdb';
import { DetailWindow } from '@/components/window-system';
import { getStoredSession } from '@/lib/supabase-auth-browser';

type WatchHistoryRecord = {
  id: string;
  media_type: string;
  media_id: number;
  title: string;
  poster?: string | null;
  progress_seconds?: number | null;
  duration_seconds?: number | null;
  watched_at?: string | null;
};

const fallbackImage = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1400&q=80';

function toMovieItem(item: WatchHistoryRecord): MovieItem {
  const poster = item.poster || fallbackImage;
  return {
    id: item.media_id,
    mediaType: item.media_type === 'tv' ? 'tv' : 'movie',
    title: item.title,
    overview: 'ประวัติการรับชมของคุณ กดรายละเอียดเพื่อดูข้อมูลเพิ่มเติม',
    posterUrl: poster,
    backdropUrl: poster,
    rating: 0,
    year: item.watched_at ? new Date(item.watched_at).getFullYear().toString() : '',
    genres: ['History'],
    language: 'en',
    status: 'published',
    label: 'History',
    badges: ['history'],
  };
}

function formatDate(value?: string | null) {
  if (!value) return 'ไม่ระบุเวลา';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'ไม่ระบุเวลา';
  return date.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

function progressText(item: WatchHistoryRecord) {
  const progress = Number(item.progress_seconds || 0);
  const duration = Number(item.duration_seconds || 0);
  if (!progress && !duration) return 'เริ่มดูแล้ว';
  if (!duration) return `ดูไปแล้ว ${Math.round(progress / 60)} นาที`;
  const percent = Math.min(100, Math.round((progress / duration) * 100));
  return `ดูไปแล้ว ${percent}%`;
}

export function HistoryPanel() {
  const [items, setItems] = useState<WatchHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<MovieItem | null>(null);
  const session = getStoredSession();
  const token = session?.access_token;
  const movieItems = useMemo(() => items.map(toMovieItem), [items]);

  async function loadHistory() {
    setLoading(true);
    setMessage('');

    try {
      if (!token) {
        setItems([]);
        setMessage('เข้าสู่ระบบก่อนเพื่อดูประวัติการรับชมของคุณ');
        return;
      }

      const response = await fetch('/api/watch-history', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลดประวัติไม่ได้');
      setItems(payload.items || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดประวัติไม่ได้');
    } finally {
      setLoading(false);
    }
  }

  async function removeItem(item: WatchHistoryRecord) {
    if (!token) return;
    setMessage('');

    try {
      const response = await fetch(`/api/watch-history?mediaType=${encodeURIComponent(item.media_type)}&mediaId=${item.media_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'ลบไม่ได้');
      setItems((current) => current.filter((record) => record.id !== item.id));
      setMessage('ลบออกจากประวัติแล้ว');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ลบไม่ได้');
    }
  }

  useEffect(() => {
    void loadHistory();
  }, [token]);

  if (!token) {
    return (
      <div className="mt-8 rounded-[28px] border border-[#e50914]/30 bg-[#170203]/65 p-5">
        <p className="text-lg font-black tracking-[-0.03em]">ยังไม่ได้เข้าสู่ระบบ</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/48">เข้าสู่ระบบก่อนเพื่อบันทึกประวัติและดูต่อข้ามอุปกรณ์</p>
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
        <button type="button" onClick={loadHistory} className="text-xs font-black text-[#e50914] hover:text-red-300">
          รีเฟรช
        </button>
      </div>

      {message ? <p className="mb-4 rounded-2xl bg-white/[0.055] px-4 py-3 text-xs font-bold text-white/58">{message}</p> : null}

      {loading ? (
        <div className="rounded-[28px] bg-white/[0.045] p-6 text-sm font-black text-white/50">กำลังโหลดประวัติ...</div>
      ) : items.length ? (
        <div className="grid gap-3">
          {items.map((item) => {
            const movieItem = toMovieItem(item);
            return (
              <article key={item.id} className="grid grid-cols-[72px_1fr] gap-3 rounded-[24px] border border-white/8 bg-white/[0.045] p-3 shadow-[0_18px_70px_rgba(0,0,0,0.42)] md:grid-cols-[96px_1fr]">
                <button type="button" onClick={() => setSelected(movieItem)} className="aspect-[2/3] overflow-hidden rounded-2xl bg-black/50 text-left">
                  {item.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.poster} alt={item.title} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                  ) : (
                    <div className="grid h-full place-items-center text-[10px] font-black text-white/28">NO POSTER</div>
                  )}
                </button>
                <div className="min-w-0 py-1">
                  <button type="button" onClick={() => setSelected(movieItem)} className="block text-left">
                    <p className="line-clamp-2 text-lg font-black leading-6 tracking-[-0.04em] md:text-2xl md:leading-7">{item.title}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/36">{item.media_type} • {item.media_id}</p>
                  </button>
                  <p className="mt-3 text-xs font-bold text-white/48">{progressText(item)}</p>
                  <p className="mt-1 text-[11px] font-semibold text-white/32">ล่าสุด {formatDate(item.watched_at)}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" onClick={() => setSelected(movieItem)} className="text-xs font-black text-[#e50914] hover:text-red-300">ดูต่อ</button>
                    <button type="button" onClick={() => removeItem(item)} className="text-xs font-black text-white/42 hover:text-white">ลบประวัติ</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-lg font-black tracking-[-0.03em]">ยังไม่มีประวัติการรับชม</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/48">เมื่อกดรับชมในหน้ารายละเอียด ประวัติจะถูกบันทึกไว้ตรงนี้</p>
        </div>
      )}

      {selected ? (
        <DetailWindow item={selected} recommendations={movieItems.filter((item) => `${item.mediaType}-${item.id}` !== `${selected.mediaType}-${selected.id}`)} onClose={() => setSelected(null)} onSelect={setSelected} />
      ) : null}
    </div>
  );
}
