'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, PointerEvent as ReactPointerEvent } from 'react';
import { categoryChips } from '@/lib/catalog';

const STORAGE_KEY = 'dofree-floating-search-position';
const DOCK_SIZE = 62;

type DockPosition = {
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function defaultPosition() {
  if (typeof window === 'undefined') return { x: 24, y: 140 };
  return {
    x: Math.max(16, window.innerWidth - DOCK_SIZE - 18),
    y: Math.max(100, Math.min(window.innerHeight * 0.34, 220)),
  };
}

function readStoredPosition() {
  if (typeof window === 'undefined') return defaultPosition();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPosition();
    const parsed = JSON.parse(raw) as Partial<DockPosition>;
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return defaultPosition();

    return {
      x: clamp(parsed.x, 10, window.innerWidth - DOCK_SIZE - 10),
      y: clamp(parsed.y, 84, window.innerHeight - DOCK_SIZE - 24),
    };
  } catch {
    return defaultPosition();
  }
}

function hiddenSearchSection() {
  return document.querySelector('main section.sticky') as HTMLElement | null;
}

function hiddenSearchInput() {
  return document.querySelector('main section.sticky form input') as HTMLInputElement | null;
}

function hiddenSearchForm() {
  return document.querySelector('main section.sticky form') as HTMLFormElement | null;
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function clickHiddenChip(label: string) {
  const buttons = Array.from(document.querySelectorAll('main section.sticky button'));
  const target = buttons.find((button) => button.textContent?.trim() === label);
  if (target instanceof HTMLButtonElement) {
    target.click();
    return true;
  }
  return false;
}

function clickVisibleClearButton() {
  const sections = document.getElementById('sections');
  const buttons = Array.from(sections?.querySelectorAll('button') || []);
  const clearButton = buttons.find((button) => button.textContent?.trim() === 'ล้างค่า');
  if (clearButton instanceof HTMLButtonElement) {
    clearButton.click();
    return true;
  }
  return false;
}

export function FloatingGlassSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [position, setPosition] = useState<DockPosition>(() => defaultPosition());
  const [dragging, setDragging] = useState(false);
  const [moved, setMoved] = useState(false);
  const [settling, setSettling] = useState(false);
  const dragRef = useRef({ pointerId: 0, startX: 0, startY: 0, originX: 0, originY: 0 });
  const inputRef = useRef<HTMLInputElement | null>(null);

  const chips = useMemo(() => categoryChips.filter((chip) => chip !== 'ทั้งหมด').slice(0, 18), []);
  const hasFilter = Boolean(query.trim()) || Boolean(activeChip);

  useEffect(() => {
    setPosition(readStoredPosition());
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
    function onResize() {
      setPosition((current) => {
        const next = {
          x: clamp(current.x, 10, window.innerWidth - DOCK_SIZE - 10),
          y: clamp(current.y, 84, window.innerHeight - DOCK_SIZE - 24),
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 180);
    return () => window.clearTimeout(timer);
  }, [open]);

  function submitSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const input = hiddenSearchInput();
    const form = hiddenSearchForm();
    if (input) setNativeInputValue(input, query);

    if (activeChip) {
      clickHiddenChip(activeChip);
    } else if (form) {
      form.requestSubmit();
    }

    setOpen(false);
    setSettling(true);
    window.setTimeout(() => setSettling(false), 950);
  }

  function clearSearch() {
    setQuery('');
    setActiveChip(null);

    const input = hiddenSearchInput();
    if (input) setNativeInputValue(input, '');

    if (!clickVisibleClearButton()) {
      const form = hiddenSearchForm();
      form?.requestSubmit();
    }

    setOpen(false);
    setSettling(true);
    window.setTimeout(() => setSettling(false), 850);
  }

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (open) return;
    setDragging(true);
    setMoved(false);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging || event.pointerId !== dragRef.current.pointerId) return;

    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) setMoved(true);

    setPosition({
      x: clamp(dragRef.current.originX + dx, 10, window.innerWidth - DOCK_SIZE - 10),
      y: clamp(dragRef.current.originY + dy, 84, window.innerHeight - DOCK_SIZE - 24),
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging || event.pointerId !== dragRef.current.pointerId) return;
    setDragging(false);

    const next = {
      x: clamp(position.x, 10, window.innerWidth - DOCK_SIZE - 10),
      y: clamp(position.y, 84, window.innerHeight - DOCK_SIZE - 24),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    window.setTimeout(() => setMoved(false), 40);
  }

  function toggleDock() {
    if (moved) return;
    setOpen((value) => !value);
  }

  return (
    <>
      <button
        type="button"
        aria-label="เปิดค้นหา"
        onClick={toggleDock}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`fixed z-[75] grid h-[62px] w-[62px] place-items-center rounded-[24px] border border-white/20 bg-white/[0.105] text-white shadow-[0_20px_70px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl transition ${dragging ? 'cursor-grabbing scale-105' : 'cursor-grab'} ${settling ? 'scale-90 opacity-70' : 'floating-search-wiggle'}`}
        style={{ left: position.x, top: position.y, touchAction: 'none' }}
      >
        <span className="absolute inset-0 rounded-[24px] bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.22),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0.04))]" />
        <span className="relative grid h-11 w-11 place-items-center rounded-[18px] bg-black/24 text-[21px] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">⌕</span>
        {hasFilter ? <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border border-black/40 bg-[#e50914] shadow-glow" /> : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[90] bg-black/18 px-3 pt-[calc(env(safe-area-inset-top)+82px)] text-white backdrop-blur-[2px]" onMouseDown={() => setOpen(false)}>
          <div
            className="ml-auto mr-1 max-h-[calc(100dvh-118px)] w-full max-w-[430px] overflow-y-auto rounded-[30px] border border-white/18 bg-[#0a0a0a]/58 p-4 shadow-[0_34px_120px_rgba(0,0,0,0.82),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl md:mr-7 md:mt-3"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]/90">Glass Search</p>
                <h2 className="mt-1 text-[25px] font-black tracking-[-0.06em]">ค้นหาเร็ว</h2>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-white/44">ค้นหาหนัง ซีรีส์ หมวดหมู่ หรือเลือกชิปด้านล่าง</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.10] text-lg font-black text-white/80 hover:bg-[#e50914]">×</button>
            </div>

            <form onSubmit={submitSearch} className="mt-4 rounded-[24px] border border-white/14 bg-white/[0.10] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl">
              <div className="flex h-12 items-center gap-2 rounded-[18px] bg-black/26 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <span className="text-lg text-white/68">⌕</span>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="พิมพ์ชื่อหนัง หรือคำค้นหา"
                  className="min-w-0 flex-1 bg-transparent text-[14px] font-bold text-white outline-none placeholder:text-white/42"
                />
                {query ? (
                  <button type="button" onClick={() => setQuery('')} className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.10] text-sm text-white/75">×</button>
                ) : null}
              </div>

              <div className="mt-3 flex gap-2">
                <button type="submit" className="h-11 flex-1 rounded-[17px] bg-[#e50914] text-xs font-black text-white shadow-[0_16px_45px_rgba(229,9,20,0.36)]">ค้นหา</button>
                <button type="button" onClick={clearSearch} className="h-11 rounded-[17px] border border-white/12 bg-white/[0.08] px-4 text-xs font-black text-white/70">ล้าง</button>
              </div>
            </form>

            <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.06] p-3 backdrop-blur-2xl">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">Quick Filters</p>
                {activeChip ? <p className="text-[10px] font-black text-[#e50914]">{activeChip}</p> : null}
              </div>
              <div className="flex max-h-[148px] flex-wrap gap-1.5 overflow-y-auto pr-1">
                {chips.map((chip) => {
                  const active = activeChip === chip;
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setActiveChip((value) => (value === chip ? null : chip))}
                      className={`h-8 rounded-full px-3 text-[10px] font-black transition ${active ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.08] text-white/68 hover:bg-white/[0.14] hover:text-white'}`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="mt-3 text-center text-[10px] font-bold text-white/32">ลากปุ่มค้นหาเพื่อย้ายตำแหน่งได้</p>
          </div>
        </div>
      ) : null}

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
