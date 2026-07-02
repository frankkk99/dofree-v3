'use client';

import { useEffect, useState } from 'react';
import type { MediaClipLanguage, MediaClipRow, MediaClipSpoilerLevel, MediaClipType } from '@/lib/media-clips';

type ClipsResponse = {
  ok?: boolean;
  clips?: MediaClipRow[];
  error?: string;
};

const clipTypeLabels: Record<MediaClipType, string> = {
  shorts: 'Shorts',
  trailer: 'ตัวอย่าง',
  summary: 'สรุปหนัง',
  spoiler: 'สปอย',
  scene: 'ฉากเด็ด',
  review: 'รีวิวสั้น',
};

const spoilerLabels: Record<MediaClipSpoilerLevel, string> = {
  none: '',
  light: 'สปอยเล็กน้อย',
  heavy: 'สปอยหนัก',
};

const languageLabels: Record<MediaClipLanguage, string> = {
  thai_dub: 'พากย์ไทย',
  thai_sub: 'ซับไทย',
  thai: 'ไทย',
  english: 'อังกฤษ',
  other: 'อื่น ๆ',
};

function favoriteKey(id: string) {
  return `dofree_clip_favorite_${id}`;
}

function favoriteIds() {
  if (typeof window === 'undefined') return new Set<string>();
  const ids = new Set<string>();
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith('dofree_clip_favorite_')) continue;
    if (window.localStorage.getItem(key) !== '1') continue;
    ids.add(key.replace('dofree_clip_favorite_', ''));
  }
  return ids;
}

function removeFavorite(id: string) {
  window.localStorage.setItem(favoriteKey(id), '0');
}

function clipHref(id: string) {
  return `/clips/feed?clip=${encodeURIComponent(id)}`;
}

function ClipCard({ clip, onRemove }: { clip: MediaClipRow; onRemove: (id: string) => void }) {
  const genres = clip.genres?.slice(0, 2).join(' · ');
  return (
    <article className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.045] shadow-[0_20px_70px_rgba(0,0,0,0.42)]">
      <a href={clipHref(clip.id)} className="group relative block aspect-[3/4] overflow-hidden bg-black">
        {clip.thumbnail_url ? (
          <img src={clip.thumbnail_url} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover blur-[1px] transition duration-500 group-hover:scale-115" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(229,9,20,0.55),transparent_18rem),linear-gradient(135deg,#151515,#030303)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.10),rgba(0,0,0,0.20)_36%,rgba(0,0,0,0.94))]" />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <span className="rounded-full bg-[#e50914]/20 px-2 py-1 text-[9px] font-black text-red-100 ring-1 ring-[#e50914]/25">{clipTypeLabels[clip.clip_type]}</span>
          <span className="rounded-full bg-black/48 px-2 py-1 text-[9px] font-black text-white/70 ring-1 ring-white/10">{languageLabels[clip.language]}</span>
        </div>
        {clip.spoiler_level !== 'none' ? <div className="absolute inset-x-[-18px] top-[42%] -rotate-12 bg-black/72 py-2 text-center text-[10px] font-black tracking-[0.12em] text-amber-100">{spoilerLabels[clip.spoiler_level]}</div> : null}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="line-clamp-2 text-sm font-black leading-tight tracking-[-0.04em] text-white md:text-lg">{clip.title}</h3>
          <p className="mt-1 line-clamp-1 text-[10px] font-bold text-white/56 md:text-xs">{clip.media_title || 'คลิปแนะนำ'}</p>
          <p className="mt-1 line-clamp-1 text-[10px] font-semibold text-white/34 md:text-xs">{genres || 'เลือกดูจากคลิปสั้น'}</p>
        </div>
      </a>
      <button type="button" onClick={() => onRemove(clip.id)} className="w-full border-t border-white/10 bg-black/24 px-3 py-3 text-xs font-black text-white/58 hover:bg-white/[0.08] hover:text-white">เอาออกจากรายการโปรด</button>
    </article>
  );
}

export default function ClipFavoritesPage() {
  const [clips, setClips] = useState<MediaClipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function loadFavorites() {
    setLoading(true);
    setMessage('');
    try {
      const ids = favoriteIds();
      if (!ids.size) {
        setClips([]);
        return;
      }
      const response = await fetch('/api/clips?limit=60', { cache: 'no-store' });
      const payload = await response.json() as ClipsResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลดรายการโปรดไม่ได้');
      setClips((payload.clips || []).filter((clip) => ids.has(clip.id)));
    } catch (error) {
      setClips([]);
      setMessage(error instanceof Error ? error.message : 'โหลดรายการโปรดไม่ได้');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFavorites();
  }, []);

  function handleRemove(id: string) {
    removeFavorite(id);
    setClips((current) => current.filter((clip) => clip.id !== id));
  }

  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/88 px-4 py-3 backdrop-blur-2xl md:px-7 md:py-4">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
          <a href="/clips" className="rounded-full bg-white/[0.08] px-4 py-2 text-xs font-black text-white/68 transition hover:bg-white/[0.14] hover:text-white">← กลับ Clips</a>
          <a href="/" className="text-xl font-black tracking-[-0.06em] text-[#e50914] md:text-3xl">ดูดีดี.online</a>
        </div>
      </header>

      <section className="mx-auto max-w-[1440px] px-4 py-5 md:px-7 md:py-8">
        <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(229,9,20,0.20),transparent_24rem),rgba(255,255,255,0.04)] p-5 shadow-[0_28px_100px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] md:rounded-[34px] md:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e50914]/90">Favorites</p>
          <h1 className="mt-2 text-[30px] font-black leading-none tracking-[-0.07em] md:text-6xl">คลิปที่ชอบ</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/56 md:text-base md:leading-7">รายการนี้เก็บไว้ในเครื่องที่ใช้งานอยู่ก่อน ยังไม่ซิงก์บัญชีผู้ใช้</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 pb-12 md:px-7">
        {message ? <p className="mb-3 rounded-2xl bg-white/[0.06] p-4 text-sm font-black text-white/54 ring-1 ring-white/10">{message}</p> : null}
        {loading ? <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-[20px] bg-white/[0.045]" />)}</div> : null}
        {!loading && !clips.length ? (
          <div className="rounded-[26px] border border-white/10 bg-white/[0.045] p-8 text-center shadow-[0_20px_70px_rgba(0,0,0,0.38)]">
            <p className="text-lg font-black tracking-[-0.04em] text-white">ยังไม่มีคลิปที่ชอบ</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/42">กลับไปที่ Feed แล้วกดหัวใจบนคลิปที่อยากเก็บไว้</p>
            <a href="/clips/feed" className="mt-5 inline-flex h-11 items-center rounded-2xl bg-[#e50914] px-5 text-xs font-black text-white">เปิด Feed</a>
          </div>
        ) : null}
        {!loading && clips.length ? <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4 2xl:grid-cols-5">{clips.map((clip) => <ClipCard key={clip.id} clip={clip} onRemove={handleRemove} />)}</div> : null}
      </section>
    </main>
  );
}
