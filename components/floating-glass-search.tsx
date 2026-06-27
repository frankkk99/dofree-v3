'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { MovieCard } from '@/components/movie-card';
import { categoryChips } from '@/lib/catalog';
import type { HomePayload, MovieItem } from '@/lib/tmdb';

const STORAGE_KEY = 'dofree-floating-search-position';
const DOCK_SIZE = 62;
const EDGE_GAP = 12;
const PANEL_WIDTH = 430;
const PANEL_GAP = 14;
const SEARCH_PLACEHOLDER = 'ค้นหาหนัง ซีรีส์ หมวดหมู่ หรือเลือกชิปด้านล่าง';

type DockPosition = {
  x: number;
  y: number;
};

type SearchState = {
  query: string;
  categories: string[];
};

type ViewportSize = {
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function uniqueMovies(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(`${item.mediaType}-${item.id}`, item);
  return [...map.values()];
}

function itemSearchText(item: MovieItem) {
  return [
    item.title,
    item.titleEn,
    item.year,
    item.language,
    item.mediaType,
    item.status,
    item.label,
    ...(item.genres || []),
    ...(item.badges || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function matchQuery(item: MovieItem, query: string) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return true;
  return itemSearchText(item).includes(keyword);
}

function matchCategory(item: MovieItem, category: string) {
  const genres = (item.genres || []).join(' ').toLowerCase();
  const badges = (item.badges || []).join(' ').toLowerCase();
  const status = (item.status || '').toLowerCase();
  const label = (item.label || '').toLowerCase();
  const language = (item.language || '').toLowerCase();
  const year = Number(item.year);
  const currentYear = new Date().getFullYear();

  switch (category) {
    case 'หนังไทย':
      return language === 'th' || genres.includes('ไทย');
    case 'หนังฝรั่ง':
      return language === 'en' || language === 'us';
    case 'พากย์ไทย':
      return language === 'th' || badges.includes('พากย์ไทย') || label.includes('พากย์ไทย');
    case 'ซับไทย':
      return badges.includes('ซับไทย') || label.includes('ซับไทย') || (language !== 'th' && Boolean(language));
    case 'พร้อมดู':
      return Boolean(item.isWatchReady || item.watchUrl || status === 'published');
    case 'คะแนนสูง':
      return item.rating >= 8;
    case 'หนังใหม่':
      return badges.includes('ใหม่') || label.includes('ใหม่') || year >= currentYear - 1;
    case 'HD':
      return badges.includes('hd') || label.includes('hd');
    case 'ZOOM':
      return badges.includes('zoom') || label.includes('zoom') || status === 'review';
    case 'ภาพยนตร์':
      return item.mediaType === 'movie';
    case 'ซีรีส์':
      return item.mediaType === 'tv';
    default:
      return (item.genres || []).some((genre) => genre.includes(category) || category.includes(genre));
  }
}

function matchCategories(item: MovieItem, categories: string[]) {
  if (!categories.length) return true;
  return categories.some((category) => matchCategory(item, category));
}

function snapToNearestEdge(position: DockPosition) {
  if (typeof window === 'undefined') return position;

  const leftX = EDGE_GAP;
  const rightX = Math.max(EDGE_GAP, window.innerWidth - DOCK_SIZE - EDGE_GAP);
  const center = position.x + DOCK_SIZE / 2;

  return {
    x: center < window.innerWidth / 2 ? leftX : rightX,
    y: clamp(position.y, 84, window.innerHeight - DOCK_SIZE - 24),
  };
}

function defaultPosition() {
  if (typeof window === 'undefined') return { x: 24, y: 140 };
  return snapToNearestEdge({
    x: Math.max(16, window.innerWidth - DOCK_SIZE - 18),
    y: Math.max(100, Math.min(window.innerHeight * 0.34, 220)),
  });
}

function readStoredPosition() {
  if (typeof window === 'undefined') return defaultPosition();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPosition();
    const parsed = JSON.parse(raw) as Partial<DockPosition>;
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return defaultPosition();

    return snapToNearestEdge({
      x: clamp(parsed.x, EDGE_GAP, window.innerWidth - DOCK_SIZE - EDGE_GAP),
      y: clamp(parsed.y, 84, window.innerHeight - DOCK_SIZE - 24),
    });
  } catch {
    return defaultPosition();
  }
}

function hiddenSearchSection() {
  return document.querySelector('main section.sticky') as HTMLElement | null;
}

export function FloatingGlassSearch({ home }: { home: HomePayload }) {
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [activeChips, setActiveChips] = useState<string[]>([]);
  const [searchState, setSearchState] = useState<SearchState | null>(null);
  const [floatingResults, setFloatingResults] = useState<MovieItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [sectionsHost, setSectionsHost] = useState<HTMLElement | null>(null);
  const [viewport, setViewport] = useState<ViewportSize>({ width: 0, height: 0 });
  const [position, setPosition] = useState<DockPosition>(() => defaultPosition());
  const [dragging, setDragging] = useState(false);
  const [moved, setMoved] = useState(false);
  const [settling, setSettling] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const dragRef = useRef({ pointerId: 0, startX: 0, startY: 0, originX: 0, originY: 0 });
  const latestPositionRef = useRef(position);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const chips = useMemo(() => categoryChips.filter((chip) => chip !== 'ทั้งหมด').slice(0, 18), []);
  const hasFilter = Boolean(query.trim()) || activeChips.length > 0 || Boolean(searchState);
  const isDesktop = viewport.width >= 768;

  const resultItems = floatingResults;

  const panelPlacement = useMemo(() => {
    if (!isDesktop || !viewport.width || !viewport.height) return null;

    const panelWidth = Math.min(PANEL_WIDTH, Math.max(320, viewport.width - 24));
    const opensRight = position.x + DOCK_SIZE / 2 < viewport.width / 2;
    const rawLeft = opensRight ? position.x + DOCK_SIZE + PANEL_GAP : position.x - panelWidth - PANEL_GAP;
    const left = clamp(rawLeft, 12, Math.max(12, viewport.width - panelWidth - 12));
    const top = clamp(position.y - 42, 72, Math.max(72, viewport.height - 560));

    return {
      left,
      top,
      width: panelWidth,
      transformOrigin: opensRight ? 'left 62px' : 'right 62px',
    };
  }, [isDesktop, position.x, position.y, viewport.height, viewport.width]);

  useEffect(() => {
    latestPositionRef.current = position;
  }, [position]);

  useEffect(() => {
    function syncViewport() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }

    setPosition(readStoredPosition());
    setSectionsHost(document.getElementById('sections'));
    syncViewport();

    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  useEffect(() => {
    const section = hiddenSearchSection();
    if (!section) return;

    const previousDisplay = section.style.display;
    const previousPointerEvents = section.style.pointerEvents;
    section.style.display = 'none';
    section.style.pointerEvents = 'none';

    return () => {
      section.style.display = previousDisplay;
      section.style.pointerEvents = previousPointerEvents;
    };
  }, []);

  useEffect(() => {
    const sections = document.getElementById('sections');
    if (!sections) return;

    if (searchState) {
      sections.setAttribute('data-floating-search-active', 'true');
    } else {
      sections.removeAttribute('data-floating-search-active');
    }
  }, [searchState]);

  useEffect(() => {
    function onResize() {
      setPosition((current) => {
        const next = snapToNearestEdge(current);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!panelVisible) return;
    const timer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 180);
    return () => window.clearTimeout(timer);
  }, [panelVisible]);

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
  }, []);

  function openPanel() {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    setPanelMounted(true);
    window.requestAnimationFrame(() => setPanelVisible(true));
  }

  function closePanel() {
    setPanelVisible(false);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setPanelMounted(false), 240);
  }

  async function submitSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const nextState = {
      query: query.trim(),
      categories: activeChips,
    };
    setSearchState(nextState);
    setSearchLoading(true);
    setSearchError('');
    setFloatingResults([]);

    window.requestAnimationFrame(() => {
      document.getElementById('sections')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    closePanel();
    setSettling(true);
    window.setTimeout(() => setSettling(false), 950);

    try {
      const params = new URLSearchParams({
        q: nextState.query,
        category: nextState.categories[0] || '',
        limit: '48',
      });
      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json() as { items?: MovieItem[] };
      setFloatingResults(Array.isArray(data.items) ? data.items : []);
    } catch {
      setSearchError('ค้นหาไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setSearchLoading(false);
    }
  }

  function clearSearch() {
    setQuery('');
    setActiveChips([]);
    setSearchState(null);
    setFloatingResults([]);
    setSearchError('');
    setSearchLoading(false);
    closePanel();
    setSettling(true);
    window.setTimeout(() => setSettling(false), 850);
  }

  function toggleChip(chip: string) {
    setActiveChips((current) => (
      current.includes(chip) ? current.filter((item) => item !== chip) : [...current, chip]
    ));
  }

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (panelMounted) return;
    setDragging(true);
    setSnapping(false);
    setMoved(false);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: latestPositionRef.current.x,
      originY: latestPositionRef.current.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging || event.pointerId !== dragRef.current.pointerId) return;

    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) setMoved(true);

    setPosition({
      x: clamp(dragRef.current.originX + dx, EDGE_GAP, window.innerWidth - DOCK_SIZE - EDGE_GAP),
      y: clamp(dragRef.current.originY + dy, 84, window.innerHeight - DOCK_SIZE - 24),
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging || event.pointerId !== dragRef.current.pointerId) return;
    setDragging(false);
    setSnapping(true);

    const next = snapToNearestEdge(latestPositionRef.current);
    setPosition(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    window.setTimeout(() => setSnapping(false), 360);
    window.setTimeout(() => setMoved(false), 60);
  }

  function toggleDock() {
    if (moved) return;
    if (panelMounted && panelVisible) {
      closePanel();
    } else {
      openPanel();
    }
  }

  const resultTitle = searchState
    ? searchState.query
      ? `ค้นหา “${searchState.query}”`
      : searchState.categories.length
        ? `หมวด: ${searchState.categories.join(' / ')}`
        : 'ผลลัพธ์ทั้งหมด'
    : '';

  const panelStyle = isDesktop && panelPlacement
    ? {
      left: panelPlacement.left,
      top: panelPlacement.top,
      width: panelPlacement.width,
      transformOrigin: panelPlacement.transformOrigin,
    }
    : undefined;

  const resultsPortal = sectionsHost && searchState
    ? createPortal(
      <div data-floating-search-results="true" className="relative z-10 bg-black px-0 py-1">
        <style jsx global>{`
          #sections[data-floating-search-active='true'] > :not([data-floating-search-results='true']) {
            display: none !important;
          }
        `}</style>
        <div className="mb-4 flex items-end justify-between gap-3 md:mb-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]/80">ผลลัพธ์</p>
            <h2 className="mt-1 text-[21px] font-black tracking-[-0.05em] md:text-[34px]">{resultTitle}</h2>
            <p className="mt-1 text-[11px] font-semibold text-white/44">พบ {resultItems.length} เรื่อง • เรียงคะแนนสูงก่อน</p>
          </div>
          <button type="button" onClick={clearSearch} className="rounded-full border border-white/12 bg-white/[0.08] px-3 py-2 text-[11px] font-black text-white/72 backdrop-blur-xl hover:bg-[#e50914] hover:text-white">
            ล้างค่า
          </button>
        </div>

        {searchLoading && !resultItems.length ? (
          <div className="flex flex-wrap gap-2.5 pb-3 sm:gap-3 md:gap-5 md:pb-4" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={`floating-search-skeleton-${index}`}
                className="h-[176px] w-[116px] animate-pulse rounded-[8px] bg-white/[0.045] sm:h-[220px] sm:w-[140px] md:h-[280px] md:w-[180px] xl:h-[300px] xl:w-[196px]"
              />
            ))}
          </div>
        ) : resultItems.length ? (
          <div className="flex flex-wrap gap-2.5 pb-3 sm:gap-3 md:gap-5 md:pb-4">
            {resultItems.map((item, index) => (
              <MovieCard
                key={`floating-search-${item.mediaType}-${item.id}-${index}`}
                item={item}
                priority={index < 8}
                priorityBadge={searchState.categories[0] || undefined}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 text-center text-sm font-bold text-white/58">
            ไม่พบหนังที่ตรงกับเงื่อนไขนี้
          </div>
        )}
      </div>,
      sectionsHost,
    )
    : null;

  return (
    <>
      <button
        type="button"
        aria-label="เปิดค้นหา"
        aria-expanded={panelVisible}
        onClick={toggleDock}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`fixed z-[75] grid h-[62px] w-[62px] place-items-center rounded-[24px] border border-white/20 bg-white/[0.105] text-white shadow-[0_20px_70px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl ${dragging ? 'cursor-grabbing scale-105 transition-transform' : 'cursor-grab'} ${snapping ? 'transition-[left,top,transform,opacity] duration-300 ease-out' : 'transition-transform'} ${settling ? 'scale-90 opacity-70' : 'floating-search-wiggle'}`}
        style={{ left: position.x, top: position.y, touchAction: 'none' }}
      >
        <span className="absolute inset-0 rounded-[24px] bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.22),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0.04))]" />
        <span className="relative grid h-11 w-11 place-items-center rounded-[18px] bg-black/24 text-[21px] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">⌕</span>
        {hasFilter ? <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border border-black/40 bg-[#e50914] shadow-glow" /> : null}
      </button>

      {panelMounted ? (
        <div
          className={`fixed inset-0 z-[90] px-3 pt-[calc(env(safe-area-inset-top)+82px)] text-white transition-[background-color,backdrop-filter,opacity] duration-300 ${panelVisible ? 'bg-black/36 opacity-100 backdrop-blur-[3px]' : 'bg-black/0 opacity-0 backdrop-blur-0'} md:bg-transparent md:backdrop-blur-0`}
          onMouseDown={closePanel}
        >
          <div
            className={`${isDesktop ? 'fixed max-h-[min(620px,calc(100dvh-92px))]' : 'ml-auto mr-1 max-h-[calc(100dvh-118px)] w-full max-w-[430px]'} overflow-y-auto rounded-[30px] border border-white/14 bg-black/90 p-4 shadow-[0_34px_120px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl transition-[opacity,transform,left,top] duration-300 ease-[cubic-bezier(0.2,0.85,0.2,1)] ${panelVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.96] opacity-0'} md:mr-0 md:bg-black/88`}
            style={panelStyle}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex justify-end">
              <button type="button" onClick={closePanel} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.10] text-lg font-black text-white/80 hover:bg-[#e50914]">×</button>
            </div>

            <form onSubmit={submitSearch} className="mt-3 rounded-[24px] border border-white/14 bg-black/82 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
              <div className="flex h-12 items-center gap-2 rounded-[18px] bg-black/70 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <span className="text-lg text-white/68">⌕</span>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={SEARCH_PLACEHOLDER}
                  className="min-w-0 flex-1 bg-transparent text-[14px] font-bold text-white outline-none placeholder:text-white/42"
                />
                {query ? (
                  <button type="button" onClick={() => setQuery('')} className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.10] text-sm text-white/75">×</button>
                ) : null}
              </div>

              <div className="mt-3 flex gap-2">
                <button type="submit" className="h-11 flex-1 rounded-[17px] bg-[#e50914] text-xs font-black text-white shadow-[0_16px_45px_rgba(229,9,20,0.36)]">ค้นหา</button>
                <button type="button" onClick={clearSearch} className="h-11 w-[78px] shrink-0 rounded-[17px] border border-white/12 bg-white/[0.08] text-xs font-black text-white/72 backdrop-blur-xl hover:bg-white/[0.14] hover:text-white">ล้าง</button>
              </div>
            </form>

            <div className="mt-4 rounded-[24px] border border-white/12 bg-black/72 p-3 backdrop-blur-2xl">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/58">Quick Filters</p>
                {activeChips.length ? <p className="text-[10px] font-black text-[#e50914]">เลือก {activeChips.length}</p> : null}
              </div>
              <div className="flex max-h-[148px] flex-wrap gap-1.5 overflow-y-auto pr-1">
                {chips.map((chip) => {
                  const active = activeChips.includes(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => toggleChip(chip)}
                      className={`h-8 rounded-full px-3 text-[10px] font-black transition ${active ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.08] text-white/74 hover:bg-white/[0.14] hover:text-white'}`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="mt-3 text-center text-[10px] font-bold text-white/34">ลากปุ่มค้นหาเพื่อย้ายตำแหน่งได้</p>
          </div>
        </div>
      ) : null}

      {resultsPortal}

      <style jsx global>{`
        @keyframes floating-search-wiggle {
          0%, 72%, 100% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
          76% { transform: translate3d(-1px, -2px, 0) rotate(-4deg) scale(1.03); }
          81% { transform: translate3d(2px, 1px, 0) rotate(4deg) scale(1.03); }
          86% { transform: translate3d(-1px, 1px, 0) rotate(-2deg) scale(1.01); }
          91% { transform: translate3d(1px, -1px, 0) rotate(2deg) scale(1.02); }
        }

        .floating-search-wiggle {
          animation: floating-search-wiggle 3.1s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
