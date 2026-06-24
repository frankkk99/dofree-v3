'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MovieItem } from '@/lib/tmdb';
import { MovieCard } from '@/components/movie-card';

const modalTabs = [
  { id: 'cast', label: 'นักแสดง' },
  { id: 'detail', label: 'รายละเอียด' },
  { id: 'recommend', label: 'แนะนำ' },
  { id: 'spoiler', label: 'สปอยหนัง' },
  { id: 'teaser', label: 'ตัวอย่าง' },
  { id: 'watch', label: 'รับชม' },
] as const;

type ModalTab = (typeof modalTabs)[number]['id'];

function ctaLabel(item: MovieItem) {
  if (item.watchUrl) return 'รับชมหนัง';
  if (item.trailerUrl) return 'ดูตัวอย่าง';
  return 'ยังไม่มีลิงก์รับชม';
}

function mockCast(item: MovieItem) {
  const roles = item.mediaType === 'tv'
    ? ['นักแสดงนำซีรีส์', 'ตัวละครหลัก', 'นักแสดงสมทบ', 'แขกรับเชิญ', 'ตัวละครรอง', 'บทพิเศษ', 'นักแสดงรับเชิญ', 'บทสำคัญ', 'นักแสดงหลัก']
    : ['นักแสดงนำ', 'ตัวละครสำคัญ', 'นักแสดงสมทบ', 'บทบาทพิเศษ', 'ตัวละครรอง', 'นักแสดงรับเชิญ', 'บทสำคัญ', 'นักแสดงหลัก', 'บทพิเศษ'];
  const genres = item.genres?.length ? item.genres : ['ภาพยนตร์'];

  return roles.map((role, index) => ({
    name: `นักแสดง ${String.fromCharCode(65 + index)}`,
    role: `${role} • ${genres[index % genres.length]}`,
    initial: String.fromCharCode(65 + index),
  }));
}

function youtubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace('www.', '');

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname.startsWith('/embed/')) return url;
      if (parsed.pathname === '/watch') {
        const videoId = parsed.searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1` : undefined;
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        const videoId = parsed.pathname.split('/')[2];
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1` : undefined;
      }
    }

    if (host === 'youtu.be') {
      const videoId = parsed.pathname.replace('/', '');
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1` : undefined;
    }
  } catch {}

  return undefined;
}

function drivePreviewUrl(url: string) {
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;

  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (url.includes('drive.google.com') && openMatch?.[1]) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;

  return undefined;
}

function isDirectVideoUrl(url: string) {
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);
}

function playerUrl(value?: string) {
  const url = value?.trim();
  if (!url) return undefined;
  if (url.includes('youtube.com/results')) return undefined;
  return youtubeEmbedUrl(url) || drivePreviewUrl(url) || url;
}

function InlinePlayer({ url, title, fallbackImage, emptyLabel }: { url?: string; title: string; fallbackImage: string; emptyLabel: string }) {
  const src = playerUrl(url);

  if (!src) {
    return (
      <div className="relative grid aspect-video place-items-center overflow-hidden rounded-xl border border-white/10 bg-black text-center md:rounded-2xl">
        <img src={fallbackImage} alt={title} loading="lazy" decoding="async" sizes="(max-width: 768px) 92vw, 720px" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 px-6">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/[0.08] text-xl font-black text-white/55 md:h-16 md:w-16 md:text-2xl">▶</div>
          <p className="mt-3 text-xs font-black text-white/72 md:text-sm">{emptyLabel}</p>
          <p className="mt-1 text-[10px] font-semibold text-white/38 md:text-xs">ไม่เปิดปลายทางภายนอก ระบบจะแสดง player ที่ฝังได้ใน Modal เท่านั้น</p>
        </div>
      </div>
    );
  }

  if (isDirectVideoUrl(src)) {
    return (
      <video
        src={src}
        className="aspect-video w-full rounded-xl border border-white/10 bg-black object-contain md:rounded-2xl"
        controls
        playsInline
        preload="metadata"
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black md:rounded-2xl">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        className="aspect-video w-full border-0 bg-black"
      />
    </div>
  );
}

export function SearchWindow({ query, setQuery, items, onClose, onSelect }: {
  query: string;
  setQuery: (value: string) => void;
  items: MovieItem[];
  onClose: () => void;
  onSelect: (item: MovieItem) => void;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return items;
    return items.filter((item) => {
      const haystack = [item.title, item.titleEn, item.year, item.mediaType, ...(item.genres || [])].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [items, normalizedQuery]);
  const visibleItems = filteredItems.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(24);
  }, [normalizedQuery]);

  useEffect(() => {
    if (visibleCount >= filteredItems.length) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleCount((count) => Math.min(count + 24, filteredItems.length));
      },
      { rootMargin: '520px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [filteredItems.length, visibleCount]);

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/90 px-3 py-4 text-white backdrop-blur-2xl" role="dialog" aria-modal="true">
      <div className="mx-auto max-w-4xl rounded-[24px] border border-white/10 bg-[#050505] p-4 shadow-[0_38px_120px_rgba(0,0,0,0.9)] md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e50914]">DOFree Search</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.06em]">ค้นหาภาพยนตร์</h2>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-xl font-black text-white/80">×</button>
        </div>
        <label className="mt-4 flex h-11 items-center rounded-2xl border border-white/10 bg-white/[0.08] px-4">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาภาพยนตร์, ซีรีส์, นักแสดง"
            className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/35"
          />
        </label>
        <div className="mt-4 grid grid-cols-4 gap-2.5 md:grid-cols-6">
          {visibleItems.map((item) => (
            <MovieCard key={`search-${item.mediaType}-${item.id}`} item={item} grid onSelect={(nextItem) => { onClose(); onSelect(nextItem); }} />
          ))}
        </div>
        {visibleItems.length < filteredItems.length ? <div ref={loadMoreRef} className="py-5 text-center text-[11px] font-black text-white/35">กำลังโหลดเพิ่ม...</div> : null}
      </div>
    </div>
  );
}

export function DetailWindow({ item, recommendations, onClose, onSelect }: {
  item: MovieItem;
  recommendations: MovieItem[];
  onClose: () => void;
  onSelect: (item: MovieItem) => void;
}) {
  const [reported, setReported] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('detail');
  const [expanded, setExpanded] = useState(false);
  const [visibleRecCount, setVisibleRecCount] = useState(8);
  const recLoadRef = useRef<HTMLDivElement | null>(null);
  const cast = mockCast(item);
  const visibleRecommendations = recommendations.slice(0, visibleRecCount);

  useEffect(() => {
    setActiveTab('detail');
    setExpanded(false);
    setReported(false);
    setVisibleRecCount(8);
  }, [item.id, item.mediaType]);

  useEffect(() => {
    if (activeTab !== 'recommend' || visibleRecCount >= recommendations.length) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const node = recLoadRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleRecCount((count) => Math.min(count + 8, recommendations.length));
      },
      { rootMargin: '420px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [activeTab, recommendations.length, visibleRecCount]);

  function playPrimary() {
    if (item.watchUrl) setActiveTab('watch');
    else if (item.trailerUrl) setActiveTab('teaser');
  }

  async function reportIssue() {
    setReported(true);
    try {
      await fetch('/api/link-reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tmdb_id: item.id, media_type: item.mediaType, title: item.title, reason: 'broken_link' }),
      });
    } catch {}
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[90] flex items-end overflow-hidden bg-black/72 px-2 pb-2 pt-12 text-white backdrop-blur-xl md:items-center md:bg-black/84 md:px-4 md:py-6" role="dialog" aria-modal="true">
      <div onClick={(event) => event.stopPropagation()} className="mx-auto flex h-[82vh] max-h-[690px] min-h-[620px] w-full max-w-[760px] flex-col overflow-hidden rounded-t-[24px] border border-white/12 bg-[#050505] shadow-[0_38px_120px_rgba(0,0,0,0.92)] md:h-[680px] md:min-h-0 md:rounded-[28px]">
        <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-white/25 md:hidden" />
        <div className="relative shrink-0 border-b border-white/8 bg-black">
          <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: `url(${item.backdropUrl || item.posterUrl})` }} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.6),#050505_100%)] md:bg-[linear-gradient(90deg,#050505_0%,rgba(5,5,5,0.9)_38%,rgba(5,5,5,0.56)_100%)]" />
          <button onClick={onClose} className="absolute right-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/70 text-lg font-black text-white/80 hover:bg-white/10 md:right-4 md:top-4 md:h-10 md:w-10 md:text-2xl" aria-label="ปิดรายละเอียด">×</button>
          <div className="relative z-10 grid grid-cols-[92px_1fr] gap-3 p-3.5 pt-5 md:grid-cols-[120px_1fr] md:gap-4 md:p-5">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_20px_55px_rgba(0,0,0,0.75)] md:rounded-2xl">
              <img src={item.posterUrl} alt={item.title} loading="lazy" decoding="async" sizes="(max-width: 768px) 92px, 120px" className="h-[138px] w-full object-cover md:h-[180px]" />
            </div>
            <div className="min-w-0 pr-8 md:pr-10">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#e50914] md:text-[10px] md:tracking-[0.24em]">{item.mediaType === 'tv' ? 'Series' : 'Movie'}</p>
              <h2 className="modal-title mt-1.5 line-clamp-2 text-[20px] font-black leading-[0.98] tracking-[-0.06em] text-white md:text-[28px]">{item.title}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-black text-white/78 md:text-[11px]">
                <span className="rounded-full bg-white/10 px-2 py-0.5">★ {item.rating.toFixed(1)}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5">{item.year}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5">{item.language === 'th' ? 'TH' : (item.language || 'EN')}</span>
                <span className="rounded-full bg-[#e50914]/20 px-2 py-0.5 text-red-100">{item.status === 'published' ? 'HD' : 'ZOOM'}</span>
              </div>
              <p className={`${expanded ? '' : 'line-clamp-3'} mt-2 text-[11px] font-medium leading-4 text-white/58 md:text-[13px] md:leading-5`}>{item.overview}</p>
              <button onClick={() => setExpanded((value) => !value)} className="mt-1 text-[10px] font-black text-red-200/80 hover:text-red-100 md:text-xs">{expanded ? 'ย่อ' : 'ดูเพิ่มเติม'}</button>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={playPrimary} disabled={!item.watchUrl && !item.trailerUrl} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-black text-white md:h-9 md:px-4 md:text-xs ${item.watchUrl || item.trailerUrl ? 'bg-[#e50914] shadow-glow' : 'bg-white/10 text-white/40'}`}>▶ {ctaLabel(item)}</button>
                <button onClick={() => setActiveTab('teaser')} className="inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/[0.1] px-3 text-[11px] font-black text-white/82 hover:bg-white/[0.16] md:h-9 md:px-4 md:text-xs">ตัวอย่าง</button>
                <button onClick={() => setActiveTab('recommend')} className="inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/[0.1] px-3 text-[11px] font-black text-white/82 hover:bg-white/[0.16] md:h-9 md:px-4 md:text-xs">+ รายการโปรด</button>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 bg-black/82 px-3 md:px-5">
          <div className="movie-rail flex gap-1 overflow-x-auto py-2 md:gap-1.5 md:py-2.5">
            {modalTabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`min-w-max rounded-md px-3 py-1.5 text-[10px] font-black transition md:px-4 md:py-2 md:text-xs ${activeTab === tab.id ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.06] text-white/55 hover:bg-white/[0.1] hover:text-white'}`}>{tab.label}</button>
            ))}
          </div>
        </div>

        <div className="movie-rail min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
          <section className="min-h-full rounded-2xl border border-white/8 bg-white/[0.03] p-3.5 md:p-5">
            {activeTab === 'detail' && (
              <div>
                <h3 className="text-base font-black md:text-xl">เกี่ยวกับภาพยนตร์</h3>
                <div className="mt-3 grid gap-2 text-[11px] font-bold text-white/62 sm:grid-cols-2 md:mt-4 md:gap-3 md:text-sm">
                  <p>ประเภท: {(item.genres || []).join(', ') || 'ภาพยนตร์'}</p>
                  <p>ความยาว: {item.runtime ? `${item.runtime} นาที` : 'ยังไม่มีข้อมูล'}</p>
                  <p>วันฉาย: {item.year}</p>
                  <p>ภาษา: {item.language === 'th' ? 'ไทย' : item.language || 'ไม่ระบุ'}</p>
                  <p>สถานะ: {item.status === 'published' ? 'พร้อมรับชม' : item.status || 'preview'}</p>
                  <p>คะแนน: {item.rating.toFixed(1)} / 10</p>
                </div>
                <p className="mt-4 text-xs leading-5 text-white/58 md:text-sm md:leading-6">{item.overview}</p>
              </div>
            )}

            {activeTab === 'cast' && (
              <div>
                <h3 className="text-base font-black md:text-xl">นักแสดงหลัก</h3>
                <div className="mt-3 grid grid-cols-3 gap-2 md:gap-3">
                  {cast.map((person) => (
                    <div key={person.name} className="min-w-0 rounded-2xl border border-white/10 bg-black/34 p-2 text-center md:p-3">
                      <div className="mx-auto grid aspect-square w-full max-w-[84px] place-items-center rounded-xl bg-[radial-gradient(circle,#6b1118,#171717)] text-lg font-black text-white md:max-w-[108px] md:rounded-2xl md:text-2xl">{person.initial}</div>
                      <p className="mt-2 line-clamp-1 text-[11px] font-black text-white md:text-sm">{person.name}</p>
                      <p className="mt-1 line-clamp-2 text-[9px] leading-3 text-white/45 md:text-[11px] md:leading-4">{person.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'spoiler' && (
              <div>
                <h3 className="text-base font-black md:text-xl">สปอยหนัง</h3>
                <div className="mt-3 rounded-2xl border border-yellow-300/15 bg-yellow-300/10 p-3 text-xs leading-5 text-yellow-50/75 md:text-sm md:leading-6">มีเนื้อหาสปอย กดดูเพิ่มเติมเพื่ออ่านเนื้อเรื่องแบบเต็มในเวอร์ชันถัดไป ตอนนี้จะแสดงเฉพาะบทสรุปสั้น: {item.overview}</div>
              </div>
            )}

            {activeTab === 'teaser' && (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-black md:text-xl">ตัวอย่างภาพยนตร์</h3>
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-black text-white/45 md:text-xs">เล่นใน Modal</span>
                </div>
                <div className="mt-3">
                  <InlinePlayer url={item.trailerUrl} title={`ตัวอย่าง ${item.title}`} fallbackImage={item.backdropUrl || item.posterUrl} emptyLabel="ยังไม่มีตัวอย่างที่ฝังใน Modal ได้" />
                </div>
              </div>
            )}

            {activeTab === 'recommend' && (
              <div>
                <h3 className="text-base font-black md:text-xl">แนะนำสำหรับคุณ</h3>
                <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-3">
                  {visibleRecommendations.map((movie, index) => <MovieCard key={`modal-rec-${movie.mediaType}-${movie.id}-${index}`} item={movie} grid compact onSelect={(nextItem) => { onSelect(nextItem); setActiveTab('detail'); setExpanded(false); }} priorityBadge={index % 2 === 0 ? 'แนะนำ' : undefined} />)}
                </div>
                {visibleRecommendations.length < recommendations.length ? <div ref={recLoadRef} className="py-4 text-center text-[10px] font-black text-white/35">กำลังโหลดเพิ่ม...</div> : null}
              </div>
            )}

            {activeTab === 'watch' && (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/70 md:text-xs">WATCH READY</p>
                    <h3 className="mt-1 text-lg font-black md:text-2xl">{item.watchUrl ? 'รับชมใน Modal' : 'ยังไม่มีลิงก์รับชม'}</h3>
                  </div>
                  {item.watchUrl ? <span className="rounded-full bg-[#e50914]/18 px-2.5 py-1 text-[10px] font-black text-red-100 md:text-xs">ไม่เปิดปลายทาง</span> : null}
                </div>
                <div className="mt-3">
                  <InlinePlayer url={item.watchUrl} title={`รับชม ${item.title}`} fallbackImage={item.backdropUrl || item.posterUrl} emptyLabel="ยังไม่มีลิงก์รับชมที่แอดมินวางไว้" />
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                  <p className="text-[11px] font-semibold leading-5 text-white/48 md:text-xs">{item.watchUrl ? 'ระบบใช้ลิงก์ผลงานส่วนตัวที่บันทึกไว้ และเล่นผ่าน player ภายในหน้าต่างนี้' : 'เมื่อเพิ่มลิงก์ใน Admin แล้ว ปุ่มรับชมจะเล่นใน Modal นี้ทันที'}</p>
                  <button onClick={reportIssue} className="h-9 rounded-xl border border-white/10 bg-black/35 px-4 text-xs font-black text-white/70 md:h-10">แจ้งลิงก์เสีย</button>
                </div>
                {reported ? <p className="mt-3 rounded-2xl border border-green-400/20 bg-green-400/10 p-3 text-xs font-bold text-green-100 md:text-sm">รับรายงานแล้ว ทีมแอดมินจะตรวจสอบลิงก์นี้</p> : null}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
