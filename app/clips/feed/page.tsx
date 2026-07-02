'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { MediaClipLanguage, MediaClipRow, MediaClipSpoilerLevel, MediaClipType } from '@/lib/media-clips';
import { mediaDetailPath } from '@/lib/seo';

type ClipsResponse = {
  ok?: boolean;
  clips?: MediaClipRow[];
  clip?: MediaClipRow | null;
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

function uniqueClips(clips: MediaClipRow[]) {
  const seen = new Set<string>();
  return clips.filter((clip) => {
    if (seen.has(clip.id)) return false;
    seen.add(clip.id);
    return true;
  });
}

function detailHref(clip: MediaClipRow) {
  if (!clip.media_type || !clip.tmdb_id) return '';
  return mediaDetailPath(clip.media_type, clip.tmdb_id, clip.media_title || clip.title);
}

function watchSrc(clip: MediaClipRow) {
  const separator = clip.embed_url.includes('?') ? '&' : '?';
  return `${clip.embed_url}${separator}autoplay=1&playsinline=1&rel=0`;
}

function favoriteKey(id: string) {
  return `dofree_clip_favorite_${id}`;
}

function initialClipId() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('clip') || '';
}

export default function ClipsFeedPage() {
  const [clips, setClips] = useState<MediaClipRow[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [allowedSpoilers, setAllowedSpoilers] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({ limit: '60' });
    if (query.trim()) params.set('q', query.trim());
    return `/api/clips?${params.toString()}`;
  }, [query]);

  useEffect(() => {
    let active = true;
    async function loadFeed() {
      setLoading(true);
      setMessage('');
      try {
        const selectedId = initialClipId();
        const [feedResponse, selectedResponse] = await Promise.all([
          fetch(apiUrl, { cache: 'no-store' }),
          selectedId ? fetch(`/api/clips?clip=${encodeURIComponent(selectedId)}`, { cache: 'no-store' }) : Promise.resolve(null),
        ]);
        const feedPayload = await feedResponse.json() as ClipsResponse;
        const selectedPayload = selectedResponse ? await selectedResponse.json() as ClipsResponse : null;
        if (!feedResponse.ok || !feedPayload.ok) throw new Error(feedPayload.error || 'โหลดคลิปไม่ได้');

        const selectedClip = selectedPayload?.ok ? selectedPayload.clip : null;
        const nextClips = uniqueClips([...(selectedClip ? [selectedClip] : []), ...(feedPayload.clips || [])]);
        if (!active) return;
        setClips(nextClips);
        setActiveIndex(0);
        requestAnimationFrame(() => containerRef.current?.scrollTo({ top: 0, behavior: 'auto' }));
      } catch (error) {
        if (!active) return;
        setClips([]);
        setMessage(error instanceof Error ? error.message : 'โหลดคลิปไม่ได้');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadFeed();
    return () => {
      active = false;
    };
  }, [apiUrl]);

  useEffect(() => {
    const state: Record<string, boolean> = {};
    clips.forEach((clip) => {
      state[clip.id] = window.localStorage.getItem(favoriteKey(clip.id)) === '1';
    });
    setFavorites(state);
  }, [clips]);

  useEffect(() => {
    const clip = clips[activeIndex];
    if (!clip || typeof window === 'undefined') return;
    window.history.replaceState(null, '', `/clips/feed?clip=${encodeURIComponent(clip.id)}`);
  }, [activeIndex, clips]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      const node = containerRef.current;
      if (!node) return;
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = Math.max(0, Math.min(activeIndex + direction, clips.length - 1));
      node.scrollTo({ top: nextIndex * node.clientHeight, behavior: 'smooth' });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, clips.length]);

  function onScroll() {
    const node = containerRef.current;
    if (!node) return;
    const nextIndex = Math.round(node.scrollTop / Math.max(node.clientHeight, 1));
    if (nextIndex !== activeIndex && nextIndex >= 0 && nextIndex < clips.length) setActiveIndex(nextIndex);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(searchInput.trim());
    setSearchOpen(false);
  }

  function toggleFavorite(clip: MediaClipRow) {
    const next = !favorites[clip.id];
    window.localStorage.setItem(favoriteKey(clip.id), next ? '1' : '0');
    setFavorites((current) => ({ ...current, [clip.id]: next }));
    setMessage(next ? 'เพิ่มในรายการโปรดแล้ว' : 'เอาออกจากรายการโปรดแล้ว');
  }

  async function shareClip(clip: MediaClipRow) {
    const url = `${window.location.origin}/clips/feed?clip=${encodeURIComponent(clip.id)}`;
    const payload = { title: clip.title, text: clip.media_title || clip.title, url };
    if (navigator.share) {
      await navigator.share(payload).catch(() => null);
      return;
    }
    await navigator.clipboard?.writeText(url).catch(() => null);
    setMessage('คัดลอกลิงก์แล้ว');
  }

  function allowSpoiler(clip: MediaClipRow) {
    setAllowedSpoilers((current) => ({ ...current, [clip.id]: true }));
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-black/82 via-black/28 to-transparent px-4 pb-10 pt-3">
        <div className="pointer-events-auto flex items-center justify-between gap-3">
          <a href="/clips" className="grid h-10 w-10 place-items-center rounded-full bg-black/44 text-lg font-black ring-1 ring-white/10 backdrop-blur-xl">←</a>
          <button type="button" onClick={() => setSearchOpen(true)} className="min-w-0 flex-1 rounded-full bg-black/42 px-4 py-2 text-left text-xs font-black text-white/58 ring-1 ring-white/10 backdrop-blur-xl">⌕ ค้นหาคลิป / หนัง</button>
          <a href="/clips/favorites" className="rounded-full bg-black/42 px-3 py-2 text-[10px] font-black text-white/58 ring-1 ring-white/10 backdrop-blur-xl">โปรด</a>
          <a href="/" className="rounded-full bg-black/42 px-3 py-2 text-[10px] font-black text-white/58 ring-1 ring-white/10 backdrop-blur-xl">หน้าแรก</a>
        </div>
      </div>

      {searchOpen ? (
        <div className="fixed inset-0 z-50 bg-black/78 p-4 backdrop-blur-xl">
          <form onSubmit={submitSearch} className="mx-auto mt-16 max-w-lg rounded-[28px] border border-white/10 bg-[#111] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black tracking-[-0.05em]">ค้นหาคลิป</h2>
              <button type="button" onClick={() => setSearchOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.08] text-sm font-black text-white/64">×</button>
            </div>
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} autoFocus placeholder="เช่น หนังผีเกาหลี / พากย์ไทย / ฉากเด็ด" className="mt-4 h-12 w-full rounded-2xl border border-white/10 bg-black/36 px-4 text-sm font-bold text-white outline-none placeholder:text-white/32 focus:border-[#e50914]/70" />
            <button className="mt-3 h-12 w-full rounded-2xl bg-[#e50914] text-sm font-black text-white" type="submit">ค้นหา</button>
          </form>
        </div>
      ) : null}

      {message && clips.length ? <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full bg-white/[0.12] px-4 py-2 text-xs font-black text-white/76 ring-1 ring-white/10 backdrop-blur-xl">{message}</div> : null}
      {loading ? <div className="grid h-screen place-items-center text-sm font-black text-white/46">กำลังโหลดคลิป...</div> : null}
      {!loading && message && !clips.length ? <div className="grid h-screen place-items-center px-6 text-center text-sm font-black text-white/54">{message}</div> : null}
      {!loading && !message && !clips.length ? <div className="grid h-screen place-items-center px-6 text-center text-sm font-black text-white/54">ยังไม่มีคลิปให้ดู</div> : null}

      <div ref={containerRef} onScroll={onScroll} className="h-screen snap-y snap-mandatory overflow-y-auto scroll-smooth">
        {clips.map((clip, index) => {
          const isActive = index === activeIndex;
          const isLockedSpoiler = clip.spoiler_level === 'heavy' && !allowedSpoilers[clip.id];
          const href = detailHref(clip);
          return (
            <section key={clip.id} className="relative grid h-screen snap-start place-items-center overflow-hidden bg-black">
              {clip.thumbnail_url ? <img src={clip.thumbnail_url} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-28 blur-2xl" /> : null}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_22rem),linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.96))]" />

              <div className="relative h-full w-full max-w-[520px] bg-black md:h-[92vh] md:overflow-hidden md:rounded-[32px] md:border md:border-white/10 md:shadow-[0_30px_100px_rgba(0,0,0,0.64)]">
                {isActive && !isLockedSpoiler ? (
                  <iframe src={watchSrc(clip)} title={clip.title} className="absolute inset-0 h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-black">
                    {clip.thumbnail_url ? <img src={clip.thumbnail_url} alt="" className="h-full w-full object-cover opacity-82" /> : null}
                    <div className="absolute inset-0 bg-black/38" />
                    <div className="relative grid h-16 w-16 place-items-center rounded-full bg-white/16 text-xl font-black ring-1 ring-white/18 backdrop-blur-xl">▶</div>
                  </div>
                )}

                {isLockedSpoiler ? (
                  <div className="absolute inset-0 z-20 grid place-items-center bg-black/72 p-6 text-center backdrop-blur-lg">
                    <div className="max-w-sm rounded-[28px] border border-amber-200/20 bg-black/70 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.6)]">
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-100">Spoiler Warning</p>
                      <h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">มีสปอยเนื้อเรื่อง</h2>
                      <p className="mt-2 text-sm font-semibold leading-6 text-white/62">คลิปนี้อาจเปิดเผยจุดสำคัญของเรื่อง</p>
                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <a href="/clips" className="rounded-2xl bg-white/[0.09] px-4 py-3 text-xs font-black text-white/72 ring-1 ring-white/10">กลับ</a>
                        <button type="button" onClick={() => allowSpoiler(clip)} className="rounded-2xl bg-[#e50914] px-4 py-3 text-xs font-black text-white">ดูต่อ</button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/70 to-transparent p-4 pb-7 md:p-5">
                  <div className="pointer-events-auto max-w-[calc(100%-74px)]">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-[#e50914]/20 px-2.5 py-1 text-[10px] font-black text-red-100 ring-1 ring-[#e50914]/25">{clipTypeLabels[clip.clip_type]}</span>
                      <span className="rounded-full bg-white/[0.10] px-2.5 py-1 text-[10px] font-black text-white/68 ring-1 ring-white/10">{languageLabels[clip.language]}</span>
                      {clip.spoiler_level !== 'none' ? <span className="rounded-full bg-amber-300/14 px-2.5 py-1 text-[10px] font-black text-amber-100 ring-1 ring-amber-200/20">{spoilerLabels[clip.spoiler_level]}</span> : null}
                      {!href ? <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[10px] font-black text-white/54 ring-1 ring-white/10">ยังไม่ผูกเรื่อง</span> : null}
                    </div>
                    <h1 className="line-clamp-2 text-xl font-black leading-tight tracking-[-0.05em] text-white md:text-2xl">{clip.title}</h1>
                    <p className="mt-1 line-clamp-1 text-sm font-bold text-white/66">{clip.media_title || 'ยังไม่ผูกหนัง'}</p>
                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-white/38">{clip.genres?.join(' · ') || 'ปัดขึ้นเพื่อดูคลิปถัดไป'}</p>
                  </div>
                </div>

                <div className="absolute bottom-28 right-3 z-20 grid gap-3 md:right-4">
                  <button type="button" onClick={() => toggleFavorite(clip)} className="grid h-12 w-12 place-items-center rounded-full bg-black/46 text-lg font-black text-white ring-1 ring-white/12 backdrop-blur-xl">{favorites[clip.id] ? '♥' : '♡'}</button>
                  <button type="button" onClick={() => void shareClip(clip)} className="grid h-12 w-12 place-items-center rounded-full bg-black/46 text-[10px] font-black text-white ring-1 ring-white/12 backdrop-blur-xl">แชร์</button>
                  {href ? <a href={href} className="grid h-12 w-12 place-items-center rounded-full bg-[#e50914] text-[10px] font-black leading-tight text-white shadow-[0_16px_44px_rgba(229,9,20,0.32)]">ดูเรื่อง</a> : <button type="button" onClick={() => setMessage('คลิปนี้ยังไม่ได้ผูกกับหน้าหนัง')} className="grid h-12 w-12 place-items-center rounded-full bg-white/[0.10] text-[10px] font-black leading-tight text-white/62 ring-1 ring-white/12 backdrop-blur-xl">ไม่ผูก</button>}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
