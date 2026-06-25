'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { HomePayload, MovieItem, MovieSection } from '@/lib/tmdb';
import { HomeExperienceV3 } from '@/components/home-experience-v3';
import { MovieCard } from '@/components/movie-card';
import { DetailWindow } from '@/components/window-system';
import { releaseMonthYear } from '@/lib/release-date';

function unique(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(`${item.mediaType}-${item.id}`, item);
  return [...map.values()];
}

function shortTitle(item: MovieItem) {
  return item.title.length > 14 ? item.title.slice(0, 13) : item.title;
}

function sectionDisplayTitle(section: MovieSection, index: number) {
  return index === 0 || section.slug === 'watch-ready' ? 'แนะนำสำหรับคุณ' : section.title;
}

function sectionFromTitle(title: string, sections: MovieSection[]) {
  const normalized = title.trim();
  if (!normalized) return null;
  if (normalized.includes('แนะนำสำหรับคุณ')) return sections[0] || null;

  return sections.find((section, index) => {
    const displayTitle = sectionDisplayTitle(section, index);
    return normalized === displayTitle || normalized.includes(displayTitle) || displayTitle.includes(normalized);
  }) || null;
}

function allSection(sections: MovieSection[]): MovieSection {
  return {
    slug: 'all-home-sections',
    eyebrow: 'รวมทั้งหมด',
    title: 'ทั้งหมด',
    description: 'รวมการ์ดหนังจากทุกหมวดที่แสดงบนหน้าแรก',
    items: unique(sections.flatMap((section) => section.items)),
  };
}

function recentUpcomingSection(items: MovieItem[]): MovieSection {
  return {
    slug: 'recent-upcoming',
    eyebrow: 'Release Window',
    title: 'หนังเข้าใหม่ / กำลังจะเข้า',
    description: 'หนังเข้าใหม่และกำลังจะเข้าฉาย',
    items: unique(items),
  };
}

function fallbackRecentlyAdded(home: HomePayload) {
  const watchReady = home.sections.find((section) => section.slug === 'watch-ready')?.items || [];
  const nowPlaying = home.sections.find((section) => section.slug === 'now-playing')?.items || [];
  const popular = home.sections.find((section) => section.slug === 'popular')?.items || [];
  return unique([
    ...watchReady.filter((item) => item.isWatchReady || item.watchUrl || item.status === 'published'),
    ...nowPlaying,
    ...popular,
    ...home.sections.flatMap((section) => section.items.slice(0, 8)),
  ]).slice(0, 36);
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function releaseWindowBounds() {
  const now = new Date();
  const fromDate = new Date(now);
  fromDate.setMonth(fromDate.getMonth() - 2);
  const toDate = new Date(now);
  toDate.setMonth(toDate.getMonth() + 8);
  return { from: isoDate(fromDate), to: isoDate(toDate) };
}

function releaseDateOf(item: MovieItem) {
  return (item as MovieItem & { releaseDate?: string }).releaseDate || '';
}

function isInReleaseWindow(item: MovieItem) {
  const date = releaseDateOf(item);
  if (!date) return false;
  const window = releaseWindowBounds();
  return date >= window.from && date <= window.to;
}

function heroPool(home: HomePayload) {
  const primary = unique(home.heroItems?.length ? home.heroItems : [home.hero]);
  const windowItems = primary.filter(isInReleaseWindow).filter((item) => item.backdropUrl || item.posterUrl);
  if (windowItems.length) return windowItems;
  return primary.filter((item) => item.backdropUrl || item.posterUrl).slice(0, 1);
}

function randomNextIndex(length: number, current: number) {
  if (length <= 1) return current;
  const next = Math.floor(Math.random() * length);
  return next === current ? (next + 1) % length : next;
}

function railFromTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest('.movie-rail') as HTMLElement | null;
}

function DesktopRailScrollFix() {
  useEffect(() => {
    let activeRail: HTMLElement | null = null;
    let startX = 0;
    let startLeft = 0;
    let dragged = false;

    function onWheel(event: WheelEvent) {
      const rail = railFromTarget(event.target);
      if (!rail || rail.scrollWidth <= rail.clientWidth) return;

      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;

      event.preventDefault();
      rail.scrollLeft += delta;
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === 'touch') return;
      const rail = railFromTarget(event.target);
      if (!rail || rail.scrollWidth <= rail.clientWidth) return;

      activeRail = rail;
      startX = event.clientX;
      startLeft = rail.scrollLeft;
      dragged = false;
      rail.style.cursor = 'grabbing';
      rail.style.userSelect = 'none';
    }

    function onPointerMove(event: PointerEvent) {
      if (!activeRail) return;
      const dx = event.clientX - startX;
      if (Math.abs(dx) > 4) dragged = true;
      if (dragged) event.preventDefault();
      activeRail.scrollLeft = startLeft - dx;
    }

    function stopDrag() {
      if (activeRail) {
        activeRail.style.cursor = '';
        activeRail.style.userSelect = '';
      }
      activeRail = null;
      window.setTimeout(() => {
        dragged = false;
      }, 0);
    }

    function onClick(event: MouseEvent) {
      if (!dragged) return;
      if (!railFromTarget(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    }

    document.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove, { passive: false });
    document.addEventListener('pointerup', stopDrag);
    document.addEventListener('pointercancel', stopDrag);
    document.addEventListener('click', onClick, true);

    return () => {
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', stopDrag);
      document.removeEventListener('pointercancel', stopDrag);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  return null;
}

function HeaderAccountMenuPortal() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function findHost() {
      const adminLink = document.querySelector('header a[href="/admin"]') as HTMLElement | null;
      const parent = adminLink?.parentElement;
      if (!adminLink || !parent) return;
      adminLink.style.display = 'none';
      setHost(parent);
    }

    findHost();
    const timer = window.setInterval(findHost, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    function onClick(event: MouseEvent) {
      if (!open) return;
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  if (!host) return null;

  return createPortal(
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="เปิดเมนูบัญชี"
        onClick={() => setOpen((value) => !value)}
        className="grid h-9 w-9 place-items-center rounded-full border border-white/12 bg-white/[0.08] text-white shadow-[0_0_24px_rgba(229,9,20,0.24)] transition hover:border-[#e50914]/70 hover:bg-[#170203] md:h-12 md:w-12"
      >
        <span className="flex flex-col gap-1.5">
          <span className="block h-0.5 w-4 rounded-full bg-white md:w-5" />
          <span className="block h-0.5 w-4 rounded-full bg-white md:w-5" />
          <span className="block h-0.5 w-4 rounded-full bg-white md:w-5" />
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+12px)] z-[120] w-[318px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[28px] border border-white/10 bg-[#080808]/96 p-3 text-white shadow-[0_24px_90px_rgba(0,0,0,0.72)] backdrop-blur-2xl md:w-[360px]">
          <div className="rounded-[22px] bg-white/[0.055] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#e50914]/85">Account</p>
            <h3 className="mt-1 text-[22px] font-black tracking-[-0.055em]">เมนูผู้ใช้</h3>
            <p className="mt-1 text-[11px] font-semibold text-white/42">จัดการบัญชี รายการโปรด และระบบสมาชิก</p>
          </div>

          <div className="mt-3 grid gap-1.5">
            {[
              ['♡ รายการโปรด', 'เก็บหนังที่อยากดูไว้ในบัญชี'],
              ['⏱ ประวัติการรับชม', 'ดูเรื่องที่เปิดล่าสุดและดูต่อ'],
              ['♛ สมัครสมาชิก', 'แพ็กเกจ Premium / ไม่มีโฆษณา'],
            ].map(([title, desc]) => (
              <button key={title} type="button" className="rounded-2xl bg-white/[0.055] px-4 py-3 text-left transition hover:bg-white/[0.1]">
                <span className="block text-sm font-black text-white/88">{title}</span>
                <span className="mt-0.5 block text-[11px] font-semibold text-white/38">{desc}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAuthMode('signin')} className={`rounded-2xl px-4 py-3 text-xs font-black ${authMode === 'signin' ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/70'}`}>
              Sign in
            </button>
            <button type="button" onClick={() => setAuthMode('signup')} className={`rounded-2xl px-4 py-3 text-xs font-black ${authMode === 'signup' ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/70'}`}>
              Sign up
            </button>
          </div>

          <div className="mt-3 rounded-[22px] border border-white/8 bg-black/35 p-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/38">
              {authMode === 'signin' ? 'เข้าสู่ระบบด้วย' : 'สมัครด้วย'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {['Google', 'Facebook', 'Apple', 'LINE', 'Email', 'เบอร์โทร'].map((label) => (
                <button key={label} type="button" className="rounded-xl bg-white/[0.075] px-3 py-2 text-[11px] font-black text-white/72 transition hover:bg-white/[0.13] hover:text-white">
                  {label}
                </button>
              ))}
            </div>
          </div>

          <a href="/admin" className="mt-3 flex items-center justify-between rounded-2xl border border-[#e50914]/35 bg-[#170203]/70 px-4 py-3 text-sm font-black text-red-100 shadow-[0_0_24px_rgba(229,9,20,0.16)]">
            <span>Admin login</span>
            <span>›</span>
          </a>
        </div>
      ) : null}
    </div>,
    host
  );
}

function HeroAutoRotatorPortal({ home, onSelect }: { home: HomePayload; onSelect: (item: MovieItem) => void }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const items = useMemo(() => heroPool(home), [home]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const item = items[index] || home.hero;

  useEffect(() => {
    const heroSection = document.querySelector('main > section.relative');
    if (heroSection instanceof HTMLElement) setHost(heroSection);
  }, []);

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(items.length - 1, 0)));
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;

    let fadeTimer: number | null = null;
    const timer = window.setInterval(() => {
      setVisible(false);
      fadeTimer = window.setTimeout(() => {
        setIndex((current) => randomNextIndex(items.length, current));
        setVisible(true);
      }, 420);
    }, 8000);

    return () => {
      window.clearInterval(timer);
      if (fadeTimer) window.clearTimeout(fadeTimer);
    };
  }, [items.length]);

  if (!host || !item) return null;

  const releaseLabel = releaseMonthYear(item as MovieItem & { releaseDate?: string });
  const heroLabel = item.status === 'published' || item.watchUrl ? 'ภาพยนตร์พร้อมรับชม' : 'ภาพยนตร์สุ่มแนะนำ';

  return createPortal(
    <div className="absolute inset-0 z-30 overflow-hidden bg-[#030303]">
      <div
        className={`absolute inset-y-0 right-0 w-full bg-cover bg-center transition-opacity duration-700 md:w-[78%] ${visible ? 'opacity-90' : 'opacity-0'}`}
        style={{ backgroundImage: `url(${item.backdropUrl || item.posterUrl})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#030303_0%,rgba(3,3,3,0.96)_24%,rgba(3,3,3,0.78)_52%,rgba(0,0,0,0.32)_78%,#030303_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06)_0%,rgba(0,0,0,0.10)_42%,#030303_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_42%,rgba(0,0,0,0.48),transparent_18rem)]" />

      <div className="relative z-10 mx-auto flex min-h-[500px] max-w-[1920px] flex-col justify-end px-4 pb-9 pt-[58px] md:min-h-[585px] md:justify-center md:px-7 md:pb-0 md:pt-[76px] xl:min-h-[610px] xl:pt-[88px]">
        <div className={`max-w-[680px] transition-all duration-700 md:ml-[6vw] xl:ml-[10vw] ${visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
          <p className="mb-3 text-[13px] font-black text-[#e50914] md:mb-5 md:text-[22px]">
            {heroLabel} <span className="ml-2 text-white/90">• เข้าฉาย {releaseLabel}</span>
          </p>

          <h1 className="hero-title max-w-[92vw] text-[42px] font-black leading-[0.88] tracking-[-0.085em] text-white md:whitespace-nowrap md:text-[92px] lg:text-[112px] xl:text-[120px]">
            {shortTitle(item)}
          </h1>

          <h2 className="mt-3 max-w-[92vw] text-[16px] font-black tracking-[-0.04em] text-white md:mt-6 md:text-[28px]">
            หนังเข้าใหม่ / กำลังจะเข้า
          </h2>

          <p className="mt-2 line-clamp-3 max-w-[92vw] text-[12px] leading-5 text-white/56 md:mt-3 md:max-w-[620px] md:text-[18px] md:leading-7">
            {item.overview}
          </p>

          <div className="mt-5 flex gap-2.5 md:mt-8 md:gap-5">
            <button type="button" onClick={() => onSelect(item)} className="inline-flex h-[42px] items-center gap-2 rounded-lg bg-[#e50914] px-5 text-[13px] font-black text-white shadow-glow md:h-[55px] md:px-9 md:text-[16px]">
              ▶ รับชม
            </button>
            <button type="button" onClick={() => onSelect(item)} className="inline-flex h-[42px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.12] px-5 text-[13px] font-black text-white/86 md:h-[55px] md:px-8 md:text-[16px]">
              ⓘ รายละเอียด
            </button>
          </div>
        </div>
      </div>
    </div>,
    host
  );
}

function ViewAllClickBridge({ sections, onOpen }: { sections: MovieSection[]; onOpen: (section: MovieSection) => void }) {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('a');
      if (!link || !link.textContent?.includes('ดูทั้งหมด')) return;

      const wrapper = link.closest('.relative') || link.parentElement;
      const title = wrapper?.querySelector('h2')?.textContent || '';
      const section = sectionFromTitle(title, sections) || sections[0];
      if (!section) return;

      event.preventDefault();
      event.stopPropagation();
      onOpen(section);
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [onOpen, sections]);

  return null;
}

function DynamicCategoryChips({ sections, onOpen }: { sections: MovieSection[]; onOpen: (section: MovieSection) => void }) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    function findHost() {
      const searchForm = document.querySelector('main section.sticky form');
      const next = searchForm?.nextElementSibling;
      if (next instanceof HTMLElement) {
        Array.from(next.children).forEach((child) => {
          if ((child as HTMLElement).id !== 'dynamic-category-chip-row') (child as HTMLElement).style.display = 'none';
        });
        setHost(next);
      }
    }

    findHost();
    const timer = window.setInterval(findHost, 1200);
    return () => window.clearInterval(timer);
  }, []);

  const categorySections = useMemo(() => [allSection(sections), ...sections], [sections]);

  if (!host) return null;

  return createPortal(
    <div id="dynamic-category-chip-row" className="flex max-h-[138px] flex-wrap gap-1.5 overflow-y-auto pr-1 md:max-h-[96px] md:gap-2 xl:max-h-[112px]">
      {categorySections.map((section, index) => (
        <button key={`${section.slug}-${index}`} type="button" onClick={() => onOpen(section)} className="inline-flex h-[22px] items-center rounded-full bg-white/[0.075] px-2.5 text-[9px] font-black leading-none text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-[#e50914] hover:text-white md:h-7 md:px-3 md:text-[11px]">
          {index === 0 ? 'ทั้งหมด' : sectionDisplayTitle(section, index - 1)}
        </button>
      ))}
    </div>,
    host
  );
}

function FullSectionOverlay({ section, allItems, onClose }: { section: MovieSection; allItems: MovieItem[]; onClose: () => void }) {
  const [selected, setSelected] = useState<MovieItem | null>(null);
  const items = section.items;
  const recommendations = selected
    ? allItems.filter((item) => `${item.mediaType}-${item.id}` !== `${selected.mediaType}-${selected.id}`).slice(0, 24)
    : allItems.slice(0, 24);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#030303]/96 p-4 text-white backdrop-blur-xl md:p-7">
      <div className="mx-auto max-w-[1920px]">
        <div className="sticky top-0 z-10 mb-5 flex items-end justify-between gap-3 border-b border-white/10 bg-[#030303]/88 py-4 backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]/80">{section.eyebrow || 'Category'}</p>
            <h2 className="mt-1 text-[28px] font-black tracking-[-0.05em] md:text-[48px]">{section.title}</h2>
            <p className="mt-1 text-xs font-bold text-white/45">ทั้งหมด {items.length} เรื่อง</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/[0.1] px-4 py-2 text-xs font-black text-white/80 hover:bg-[#e50914]">ปิด</button>
        </div>
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-6 md:gap-4 lg:grid-cols-7 xl:grid-cols-8">
          {items.map((item, index) => (
            <MovieCard key={`full-${section.slug}-${item.mediaType}-${item.id}-${index}`} item={item} onSelect={setSelected} grid priority={index < 12} priorityBadge={section.title === 'ทั้งหมด' ? undefined : section.title} />
          ))}
        </div>
      </div>
      {selected ? <DetailWindow item={selected} recommendations={recommendations} onClose={() => setSelected(null)} onSelect={setSelected} /> : null}
    </div>
  );
}

function RealtimeAddedCarousel({ items, onViewAll }: { items: MovieItem[]; onViewAll: (items: MovieItem[]) => void }) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);
  const doubled = useMemo(() => [...items, ...items], [items]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || items.length < 4) return;
    const pixelsPerSecond = 18;
    function tick(now: number) {
      if (!rail) return;
      const last = lastFrameRef.current ?? now;
      const delta = Math.min(now - last, 64);
      lastFrameRef.current = now;
      if (!paused) {
        rail.scrollLeft += (pixelsPerSecond * delta) / 1000;
        const half = rail.scrollWidth / 2;
        if (half > 0 && rail.scrollLeft >= half) rail.scrollLeft -= half;
      }
      frameRef.current = window.requestAnimationFrame(tick);
    }
    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      lastFrameRef.current = null;
    };
  }, [items.length, paused]);

  function pauseThenResume() {
    setPaused(true);
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      lastFrameRef.current = null;
      setPaused(false);
    }, 2000);
  }

  if (!items.length) return null;

  return (
    <section className="mx-auto max-w-[1920px] bg-[#030303] px-4 pb-4 pt-2 md:px-7 md:pb-6 md:pt-3">
      <div className="mb-3 flex items-end justify-between gap-3 md:mb-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#e50914]/80">Release Window</p>
          <h2 className="mt-1 text-[20px] font-black tracking-[-0.04em] md:text-[30px]">หนังเข้าใหม่ / กำลังจะเข้า</h2>
        </div>
        <button type="button" onClick={() => onViewAll(items)} className="text-[12px] font-black text-white/50 hover:text-white md:text-[16px]">ดูทั้งหมด ›</button>
      </div>
      <div ref={railRef} onPointerDown={pauseThenResume} onPointerUp={pauseThenResume} onTouchEnd={pauseThenResume} onWheel={pauseThenResume} className="movie-rail flex cursor-grab gap-2.5 overflow-x-auto scroll-smooth pb-3 sm:gap-3 md:gap-5 md:pb-4">
        {doubled.map((item, index) => (
          <MovieCard key={`realtime-${item.mediaType}-${item.id}-${index}`} item={item} priority={index < 8} priorityBadge={item.label || (index % 3 === 0 ? 'เข้าใหม่' : index % 3 === 1 ? 'พร้อมดู' : undefined)} />
        ))}
      </div>
    </section>
  );
}

function RealtimePortal({ home, onOpen }: { home: HomePayload; onOpen: (section: MovieSection) => void }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [liveItems, setLiveItems] = useState<MovieItem[]>([]);
  const fallbackItems = useMemo(() => fallbackRecentlyAdded(home), [home]);
  const items = liveItems.length ? liveItems : fallbackItems;

  useEffect(() => {
    const searchSection = document.querySelector('main section.sticky');
    if (!searchSection?.parentElement) return;
    let node = document.getElementById('realtime-added-host');
    if (!node) {
      node = document.createElement('div');
      node.id = 'realtime-added-host';
      searchSection.insertAdjacentElement('afterend', node);
    }
    setHost(node);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadRecent() {
      try {
        const response = await fetch('/api/catalog/recent', { cache: 'no-store' });
        const payload = (await response.json()) as { ok?: boolean; items?: MovieItem[] };
        if (active && payload.ok && payload.items?.length) setLiveItems(payload.items);
      } catch {}
    }
    void loadRecent();
    const timer = window.setInterval(loadRecent, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return host ? createPortal(<RealtimeAddedCarousel items={items} onViewAll={(nextItems) => onOpen(recentUpcomingSection(nextItems))} />, host) : null;
}

export function HomeRealtimeWrapper({ home }: { home: HomePayload }) {
  const [openSection, setOpenSection] = useState<MovieSection | null>(null);
  const [selected, setSelected] = useState<MovieItem | null>(null);
  const allItems = useMemo(() => unique(home.sections.flatMap((section) => section.items)), [home.sections]);
  const recommendations = selected ? allItems.filter((item) => `${item.mediaType}-${item.id}` !== `${selected.mediaType}-${selected.id}`).slice(0, 24) : allItems.slice(0, 24);

  return (
    <>
      <HomeExperienceV3 home={home} />
      <HeaderAccountMenuPortal />
      <HeroAutoRotatorPortal home={home} onSelect={setSelected} />
      <DesktopRailScrollFix />
      <ViewAllClickBridge sections={home.sections} onOpen={setOpenSection} />
      <DynamicCategoryChips sections={home.sections} onOpen={setOpenSection} />
      <RealtimePortal home={home} onOpen={setOpenSection} />
      {openSection ? <FullSectionOverlay section={openSection} allItems={allItems} onClose={() => setOpenSection(null)} /> : null}
      {selected ? <DetailWindow item={selected} recommendations={recommendations} onClose={() => setSelected(null)} onSelect={setSelected} /> : null}
    </>
  );
}
