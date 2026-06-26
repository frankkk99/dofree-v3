'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { HomePayload, MovieItem } from '@/lib/tmdb';
import { releaseMonthYear } from '@/lib/release-date';

function uniqueItems(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(`${item.mediaType}-${item.id}`, item);
  return [...map.values()];
}

function shortTitle(item: MovieItem) {
  return item.title.length > 16 ? `${item.title.slice(0, 15)}…` : item.title;
}

function carouselItems(home: HomePayload) {
  return uniqueItems([
    ...(home.heroItems?.length ? home.heroItems : [home.hero]),
    ...home.sections.flatMap((section) => section.items.slice(0, 10)),
  ])
    .filter((item) => item.backdropUrl || item.posterUrl)
    .slice(0, 18);
}

function nextIndex(length: number, current: number) {
  if (length <= 1) return current;
  return (current + 1) % length;
}

function detailHref(item: MovieItem) {
  return `/${item.mediaType}/${item.id}`;
}

function watchHref(item: MovieItem) {
  return item.watchUrl ? `/watch/${item.mediaType}/${item.id}` : detailHref(item);
}

export function ReliableHeroCarousel({ home }: { home: HomePayload }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const items = useMemo(() => carouselItems(home), [home]);
  const item = items[index] || home.hero;

  useEffect(() => {
    const heroSection = document.querySelector('main > section.relative');
    if (heroSection instanceof HTMLElement) setHost(heroSection);
  }, []);

  useEffect(() => {
    setIndex(0);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;

    let fadeTimer: number | null = null;
    const timer = window.setInterval(() => {
      setVisible(false);
      fadeTimer = window.setTimeout(() => {
        setIndex((current) => nextIndex(items.length, current));
        setVisible(true);
      }, 420);
    }, 7000);

    return () => {
      window.clearInterval(timer);
      if (fadeTimer) window.clearTimeout(fadeTimer);
    };
  }, [items.length]);

  if (!host || !item) return null;

  const releaseLabel = releaseMonthYear(item as MovieItem & { releaseDate?: string });
  const heroLabel = item.status === 'published' || item.watchUrl ? 'พร้อมรับชม' : 'แนะนำจากดูดีดี';

  return createPortal(
    <div className="absolute inset-0 z-[36] overflow-hidden bg-[#030303]">
      <div
        className={`absolute inset-y-0 right-0 w-full bg-cover bg-center transition-opacity duration-700 md:w-[78%] ${visible ? 'opacity-90' : 'opacity-0'}`}
        style={{ backgroundImage: `url(${item.backdropUrl || item.posterUrl})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#030303_0%,rgba(3,3,3,0.97)_24%,rgba(3,3,3,0.76)_54%,rgba(0,0,0,0.32)_78%,#030303_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.12)_42%,#030303_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_42%,rgba(0,0,0,0.54),transparent_20rem)]" />

      <div className="relative z-10 mx-auto flex min-h-[500px] max-w-[1920px] flex-col justify-end px-4 pb-9 pt-[58px] md:min-h-[585px] md:justify-center md:px-7 md:pb-0 md:pt-[76px] xl:min-h-[610px] xl:pt-[88px]">
        <div className={`max-w-[700px] transition-all duration-700 md:ml-[6vw] xl:ml-[10vw] ${visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
          <p className="mb-3 text-[12px] font-black uppercase tracking-[0.12em] text-[#e50914] md:mb-5 md:text-[20px]">
            {heroLabel}
            <span className="ml-2 text-white/82">• {releaseLabel || item.year}</span>
          </p>
          <h1 className="hero-title max-w-[92vw] text-[42px] font-black leading-[0.88] tracking-[-0.085em] text-white md:whitespace-nowrap md:text-[92px] lg:text-[112px] xl:text-[120px]">
            {shortTitle(item)}
          </h1>
          <p className="mt-3 line-clamp-3 max-w-[92vw] text-[12px] leading-5 text-white/56 md:mt-6 md:max-w-[620px] md:text-[18px] md:leading-7">
            {item.overview}
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5 md:mt-8 md:gap-5">
            <a href={watchHref(item)} className="inline-flex h-[42px] items-center gap-2 rounded-lg bg-[#e50914] px-5 text-[13px] font-black text-white shadow-glow md:h-[55px] md:px-9 md:text-[16px]">
              ▶ รับชม
            </a>
            <a href={detailHref(item)} className="inline-flex h-[42px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.12] px-5 text-[13px] font-black text-white/86 md:h-[55px] md:px-8 md:text-[16px]">
              ⓘ รายละเอียด
            </a>
          </div>

          <div className="mt-5 flex gap-1.5">
            {items.slice(0, 8).map((dot, dotIndex) => (
              <button
                key={`${dot.mediaType}-${dot.id}-${dotIndex}`}
                type="button"
                aria-label={`ไปยังเรื่องที่ ${dotIndex + 1}`}
                onClick={() => {
                  setVisible(false);
                  window.setTimeout(() => {
                    setIndex(dotIndex);
                    setVisible(true);
                  }, 180);
                }}
                className={`h-1.5 rounded-full transition-all ${dotIndex === index ? 'w-8 bg-[#e50914]' : 'w-3 bg-white/24 hover:bg-white/50'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>,
    host,
  );
}
