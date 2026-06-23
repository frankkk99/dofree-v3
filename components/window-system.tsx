'use client';

import { useMemo, useState } from 'react';
import type { MovieItem } from '@/lib/tmdb';
import { MovieCard } from '@/components/movie-card';

const flowSteps = [
  { title: 'ค้นหาภาพยนตร์', caption: 'พิมพ์ชื่อเรื่องหรือคำค้น', icon: '⌕' },
  { title: 'เลือกดูรายละเอียด', caption: 'แตะเพื่อดูข้อมูลเพิ่มเติม', icon: '▣' },
  { title: 'ดูตัวอย่าง', caption: 'รับชม Teaser / Trailer', icon: '▶' },
  { title: 'ดูนักแสดง', caption: 'สำรวจทีมนักแสดง', icon: '♙' },
  { title: 'แนะนำสำหรับคุณ', caption: 'พบเรื่องที่คุณอาจชอบ', icon: '☆' },
  { title: 'พร้อมรับชม', caption: 'เปิดลิงก์หรือรับชมต่อ', icon: '▻' },
] as const;

const modalTabs = [
  { id: 'cast', label: 'นักแสดง' },
  { id: 'spoiler', label: 'สปอยหนัง' },
  { id: 'detail', label: 'รายละเอียด' },
  { id: 'teaser', label: 'ตัวอย่าง' },
  { id: 'recommend', label: 'แนะนำ' },
  { id: 'watch', label: 'รับชม' },
] as const;

type ModalTab = (typeof modalTabs)[number]['id'];

function ctaLabel(item: MovieItem) {
  if (item.watchUrl) return 'รับชมหนัง';
  if (item.trailerUrl) return 'ดูตัวอย่าง';
  return 'ยังไม่มีลิงก์รับชม';
}

function mockCast(item: MovieItem) {
  const base = item.mediaType === 'tv'
    ? ['นักแสดงนำซีรีส์', 'ตัวละครหลัก', 'นักแสดงสมทบ', 'แขกรับเชิญ']
    : ['นักแสดงนำ', 'ตัวละครสำคัญ', 'นักแสดงสมทบ', 'บทบาทพิเศษ'];

  return base.map((role, index) => ({
    name: `นักแสดง ${String.fromCharCode(65 + index)}`,
    role: `${role}${item.genres?.[index % (item.genres.length || 1)] ? ` • ${item.genres?.[index % item.genres.length]}` : ''}`,
    initial: String.fromCharCode(65 + index),
  }));
}

function FlowPath() {
  return (
    <div className="relative mt-7 hidden lg:block">
      <div className="absolute left-10 right-10 top-5 border-t border-dashed border-[#e50914]/55" />
      <div className="relative grid grid-cols-6 gap-5">
        {flowSteps.map((step, index) => (
          <div key={step.title} className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e50914] text-sm font-black text-white shadow-glow">{index + 1}</span>
              <div className="min-w-0">
                <p className="line-clamp-1 text-[13px] font-black text-white">{step.title}</p>
                <p className="line-clamp-1 text-[11px] font-bold text-white/38">{step.caption}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniJourneyPreview({ items, onSelect }: { items: MovieItem[]; onSelect: (item: MovieItem) => void }) {
  const previewItems = items.slice(0, 4);
  const heroItem = previewItems[0];
  const recommended = previewItems.slice(1, 4);

  return (
    <div className="mt-7 hidden grid-cols-6 gap-4 xl:grid">
      <div className="rounded-[26px] border border-white/10 bg-[#08090b] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
        <div className="mb-4 flex items-center justify-between"><span className="text-2xl font-black text-[#e50914]">M</span><span className="text-white/55">☰</span></div>
        <p className="text-center text-sm font-black">ค้นหาภาพยนตร์</p>
        <div className="mt-4 rounded-xl bg-white/[0.07] px-3 py-2 text-[11px] text-white/45">⌕ ค้นหาภาพยนตร์...</div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {previewItems.slice(0, 3).map((item) => <div key={`mini-poster-${item.id}`} className="aspect-[2/3] rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${item.posterUrl})` }} />)}
        </div>
      </div>

      <div className="rounded-[26px] border border-[#e50914]/35 bg-[#08090b] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
        <div className="mb-3 rounded-xl bg-white/[0.07] px-3 py-2 text-[11px] text-white/45">ผลการค้นหา</div>
        {previewItems.slice(0, 3).map((item, index) => (
          <button key={`mini-list-${item.id}`} onClick={() => onSelect(item)} className={`mb-2 grid w-full grid-cols-[54px_1fr] gap-3 rounded-xl p-2 text-left ${index === 0 ? 'border border-[#e50914] bg-[#e50914]/10' : 'bg-white/[0.04]'}`}>
            <div className="h-16 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${item.posterUrl})` }} />
            <div className="min-w-0"><p className="line-clamp-1 text-[12px] font-black">{item.title}</p><p className="text-[11px] text-[#f4c46b]">★ {item.rating.toFixed(1)}</p></div>
          </button>
        ))}
      </div>

      <div className="rounded-[26px] border border-white/10 bg-[#08090b] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
        <div className="aspect-[3/4] rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${heroItem?.posterUrl})` }} />
        <p className="mt-3 line-clamp-1 text-lg font-black">{heroItem?.title || 'ภาพยนตร์'}</p>
        <button onClick={() => heroItem && onSelect(heroItem)} className="mt-3 h-10 w-full rounded-xl bg-[#e50914] text-xs font-black text-white">▶ รับชมตัวอย่าง</button>
      </div>

      <div className="rounded-[26px] border border-white/10 bg-[#08090b] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
        <p className="mb-4 text-center text-sm font-black">นักแสดงหลัก</p>
        {['A', 'B', 'C', 'D'].map((letter) => (
          <div key={letter} className="mb-3 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#251113] text-sm font-black text-white">{letter}</span>
            <div><p className="text-[12px] font-black">นักแสดง {letter}</p><p className="text-[10px] text-white/35">รับบท ตัวละครหลัก</p></div>
          </div>
        ))}
      </div>

      <div className="rounded-[26px] border border-white/10 bg-[#08090b] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
        <p className="mb-4 text-center text-sm font-black">แนะนำสำหรับคุณ</p>
        <div className="grid grid-cols-3 gap-2">
          {recommended.map((item) => <button key={`mini-rec-${item.id}`} onClick={() => onSelect(item)} className="text-left"><div className="aspect-[2/3] rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${item.posterUrl})` }} /><p className="mt-1 line-clamp-1 text-[10px]">{item.title}</p><p className="text-[10px] text-[#f4c46b]">{Math.round(item.rating * 10)}%</p></button>)}
        </div>
      </div>

      <div className="rounded-[26px] border border-[#e50914]/30 bg-[radial-gradient(circle_at_top,rgba(229,9,20,0.34),#08090b_55%)] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
        <p className="text-center text-lg font-black">พร้อมรับชม</p>
        <p className="mt-1 text-center text-[11px] text-white/55">สามารถรับชมได้ทันที</p>
        <div className="mt-5 grid place-items-center rounded-2xl border border-[#e50914]/35 bg-black/35 py-8 text-[#ff7c7c]">▶ WATCH READY</div>
        <a href="/watch-ready" className="mt-4 flex h-10 items-center justify-center rounded-xl bg-[#e50914] text-xs font-black text-white">รับชมเลย</a>
        <button className="mt-2 h-9 w-full rounded-xl border border-white/10 bg-black/35 text-[11px] font-black text-white/65">+ ลิสต์ของฉัน</button>
      </div>
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
  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return items.slice(0, 12);
    return items.filter((item) => {
      const haystack = [item.title, item.titleEn, item.year, item.mediaType, ...(item.genres || [])].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    }).slice(0, 16);
  }, [items, normalizedQuery]);

  const watchReady = items.filter((item) => item.isWatchReady || item.watchUrl).slice(0, 4);

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/90 px-2 py-3 text-white backdrop-blur-2xl sm:px-3 sm:py-4 md:px-5 md:py-6" role="dialog" aria-modal="true">
      <div className="mx-auto max-w-[1780px] overflow-hidden rounded-[22px] border border-white/10 bg-[#050505] shadow-[0_38px_120px_rgba(0,0,0,0.9)] md:rounded-[30px]">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(229,9,20,0.24),transparent_24rem)] p-4 md:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/55 md:text-xs md:tracking-[0.28em]">ประสบการณ์ใช้งานบนมือถือ | Movie Website</p>
              <h2 className="mt-1.5 text-[25px] font-black leading-[1.02] tracking-[-0.055em] md:mt-2 md:text-5xl">เส้นทางการ<span className="text-[#e50914]">ค้นหาและรับชม</span>ภาพยนตร์</h2>
              <p className="mt-2 max-w-2xl text-xs font-bold text-white/45 md:text-sm">ค้นหา ดูข้อมูล ตัดสินใจ และพร้อมรับชมในไม่กี่ขั้นตอน</p>
            </div>
            <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-xl font-black text-white/80 hover:bg-white/10 md:h-11 md:w-11 md:text-2xl" aria-label="ปิดหน้าต่างค้นหา">×</button>
          </div>

          <FlowPath />
          <MiniJourneyPreview items={items} onSelect={(item) => { onClose(); onSelect(item); }} />

          <div className="mt-5 grid gap-3 md:mt-7 lg:grid-cols-[1fr_360px]">
            <div>
              <label className="flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-4 shadow-[0_20px_70px_rgba(0,0,0,0.45)] md:h-14 md:gap-3 md:px-5">
                <span className="text-xl text-[#e50914] md:text-2xl">⌕</span>
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ค้นหาภาพยนตร์, ซีรีส์, นักแสดง"
                  className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/35 md:text-base"
                />
              </label>
              <div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto text-[10px] font-black text-white/55 md:mt-4 md:flex-wrap md:gap-3 md:text-xs">
                {['ทั้งหมด', 'ภาพยนตร์', 'ซีรีส์', 'นักแสดง', 'ผู้กำกับ'].map((tab, index) => (
                  <span key={tab} className={`min-w-max rounded-full border px-3 py-1.5 md:px-4 md:py-2 ${index === 0 ? 'border-[#e50914] bg-[#e50914]/18 text-red-100' : 'border-white/10 bg-white/[0.04]'}`}>{tab}</span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e50914]/20 bg-[#e50914]/10 p-3 md:p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/70 md:text-xs md:tracking-[0.22em]">Watch Ready</p>
              <h3 className="mt-1.5 text-base font-black md:mt-2 md:text-xl">พร้อมรับชม</h3>
              <p className="mt-1 text-xs text-white/55 md:text-sm">เลือกเรื่องที่มีสถานะพร้อมดู แล้วกดรับชมได้ทันที</p>
              <a href="/watch-ready" className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-[#e50914] px-4 text-xs font-black text-white shadow-glow md:mt-4 md:h-11 md:rounded-xl md:px-5 md:text-sm">ดูทั้งหมด</a>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:gap-5 md:p-7 lg:grid-cols-[1fr_360px]">
          <section>
            <div className="mb-3 flex items-center justify-between md:mb-4">
              <h3 className="text-base font-black md:text-xl">ผลการค้นหา</h3>
              <p className="text-xs font-bold text-white/40 md:text-sm">พบ {filteredItems.length} เรื่อง</p>
            </div>
            <div className="space-y-2.5 md:space-y-3">
              {filteredItems.length ? filteredItems.map((item) => (
                <button
                  key={`search-${item.mediaType}-${item.id}`}
                  onClick={() => { onClose(); onSelect(item); }}
                  className="group grid w-full grid-cols-[66px_1fr] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 text-left transition hover:border-[#e50914]/70 hover:bg-[#e50914]/10 md:grid-cols-[92px_1fr_auto] md:gap-4 md:p-3"
                >
                  <div className="relative h-[92px] overflow-hidden rounded-xl bg-cover bg-center md:h-28" style={{ backgroundImage: `url(${item.posterUrl})` }} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      {(item.badges || []).slice(0, 2).map((badge) => <span key={badge} className="rounded bg-[#e50914] px-1.5 py-0.5 text-[8px] font-black text-white md:px-2 md:py-1 md:text-[10px]">{badge}</span>)}
                    </div>
                    <h4 className="mt-1.5 line-clamp-1 text-sm font-black text-white md:mt-2 md:text-lg">{item.title}</h4>
                    <p className="mt-1 text-[11px] font-bold text-white/45 md:text-sm">{item.year} • {item.mediaType === 'tv' ? 'Series' : 'Movie'} • ★ {item.rating.toFixed(1)}</p>
                    <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-white/45 md:mt-2 md:text-sm md:leading-6">{item.overview}</p>
                  </div>
                  <span className="hidden text-3xl text-[#e50914] transition group-hover:translate-x-1 md:block">›</span>
                </button>
              )) : <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/55 md:p-8">ไม่พบผลลัพธ์ ลองค้นชื่อเรื่องหรือหมวดอื่น</div>}
            </div>
          </section>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:p-4">
            <h3 className="text-base font-black md:text-lg">แนะนำสำหรับคุณ</h3>
            <div className="mt-3 grid grid-cols-4 gap-2 md:mt-4 md:grid-cols-2 md:gap-3">
              {watchReady.map((item) => (
                <button key={`ready-${item.mediaType}-${item.id}`} onClick={() => { onClose(); onSelect(item); }} className="rounded-xl border border-white/10 bg-white/[0.04] p-1.5 text-left hover:border-[#e50914]/70 md:p-2">
                  <div className="aspect-[2/3] rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${item.posterUrl})` }} />
                  <p className="mt-1.5 line-clamp-1 text-[10px] font-black text-white md:mt-2 md:text-xs">{item.title}</p>
                  <p className="text-[9px] font-bold text-[#f4c46b] md:text-[11px]">{Math.round(Math.min(98, item.rating * 10 + 8))}%</p>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function DetailWindow({ item, recommendations, onClose, onSelect }: { item: MovieItem; recommendations: MovieItem[]; onClose: () => void; onSelect: (item: MovieItem) => void }) {
  const [reported, setReported] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('detail');
  const [expanded, setExpanded] = useState(false);
  const cast = mockCast(item);
  const primaryHref = item.watchUrl || item.trailerUrl || `/${item.mediaType}/${item.id}`;

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
    <div onClick={onClose} className="fixed inset-0 z-[90] flex items-end overflow-hidden bg-black/72 px-2 pb-2 pt-12 text-white backdrop-blur-xl md:items-center md:overflow-y-auto md:bg-black/84 md:px-4 md:py-6" role="dialog" aria-modal="true">
      <div onClick={(event) => event.stopPropagation()} className="mx-auto flex max-h-[84vh] w-full max-w-[760px] flex-col overflow-hidden rounded-t-[24px] border border-white/10 bg-[#050505] shadow-[0_38px_120px_rgba(0,0,0,0.92)] md:max-h-[82vh] md:rounded-[28px]">
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-white/25 md:hidden" />
        <div className="relative border-b border-white/10 bg-black">
          <div className="absolute inset-0 bg-cover bg-center opacity-28" style={{ backgroundImage: `url(${item.backdropUrl || item.posterUrl})` }} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.72),#050505_100%)] md:bg-[linear-gradient(90deg,#050505_0%,rgba(5,5,5,0.9)_38%,rgba(5,5,5,0.55)_100%)]" />
          <button onClick={onClose} className="absolute right-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/70 text-lg font-black text-white/80 hover:bg-white/10 md:right-4 md:top-4 md:h-10 md:w-10 md:text-2xl" aria-label="ปิดรายละเอียด">×</button>
          <div className="relative z-10 grid grid-cols-[92px_1fr] gap-3 p-3.5 pt-5 md:grid-cols-[120px_1fr] md:gap-4 md:p-5">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_20px_55px_rgba(0,0,0,0.75)] md:rounded-2xl">
              <img src={item.posterUrl} alt={item.title} className="h-[138px] w-full object-cover md:h-[180px]" />
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
                <a href={primaryHref} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-black text-white md:h-9 md:px-4 md:text-xs ${item.watchUrl || item.trailerUrl ? 'bg-[#e50914] shadow-glow' : 'pointer-events-none bg-white/10 text-white/40'}`}>▶ {ctaLabel(item)}</a>
                <button onClick={() => setActiveTab('teaser')} className="inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/[0.1] px-3 text-[11px] font-black text-white/82 hover:bg-white/[0.16] md:h-9 md:px-4 md:text-xs">ตัวอย่าง</button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-white/10 bg-black/82 px-3 md:px-5">
          <div className="movie-rail flex gap-1.5 overflow-x-auto py-2.5 md:gap-2 md:py-3">
            {modalTabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`min-w-max rounded-full px-3 py-1.5 text-[11px] font-black transition md:px-4 md:py-2 md:text-xs ${activeTab === tab.id ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.06] text-white/55 hover:bg-white/[0.1] hover:text-white'}`}>{tab.label}</button>
            ))}
          </div>
        </div>

        <div className="movie-rail min-h-0 flex-1 overflow-y-auto p-3.5 md:p-5">
          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 md:p-5">
            {activeTab === 'detail' && <div><h3 className="text-base font-black md:text-xl">เกี่ยวกับภาพยนตร์</h3><div className="mt-3 grid gap-2 text-[11px] font-bold text-white/62 sm:grid-cols-2 md:mt-4 md:gap-3 md:text-sm"><p>ประเภท: {(item.genres || []).join(', ') || 'ภาพยนตร์'}</p><p>ความยาว: {item.runtime ? `${item.runtime} นาที` : 'ยังไม่มีข้อมูล'}</p><p>วันฉาย: {item.year}</p><p>ภาษา: {item.language === 'th' ? 'ไทย' : item.language || 'ไม่ระบุ'}</p><p>สถานะ: {item.status === 'published' ? 'พร้อมรับชม' : item.status || 'preview'}</p><p>คะแนน: {item.rating.toFixed(1)} / 10</p></div><p className="mt-4 text-xs leading-5 text-white/58 md:text-sm md:leading-6">{item.overview}</p></div>}
            {activeTab === 'spoiler' && <div><h3 className="text-base font-black md:text-xl">สปอยหนัง</h3><div className="mt-3 rounded-2xl border border-yellow-300/15 bg-yellow-300/10 p-3 text-xs leading-5 text-yellow-50/75 md:text-sm md:leading-6">มีเนื้อหาสปอย กดดูเพิ่มเติมเพื่ออ่านเนื้อเรื่องแบบเต็มในเวอร์ชันถัดไป ตอนนี้จะแสดงเฉพาะบทสรุปสั้น: {item.overview}</div></div>}
            {activeTab === 'teaser' && <div><h3 className="text-base font-black md:text-xl">ตัวอย่างภาพยนตร์</h3><div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black md:rounded-2xl"><div className="relative aspect-video bg-cover bg-center" style={{ backgroundImage: `url(${item.backdropUrl || item.posterUrl})` }}><div className="absolute inset-0 bg-black/45" /><a href={item.trailerUrl || `/${item.mediaType}/${item.id}`} className="absolute inset-0 grid place-items-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#e50914] text-xl font-black text-white shadow-glow md:h-16 md:w-16 md:text-2xl">▶</span></a><div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black to-transparent p-3 text-[10px] font-bold text-white/70 md:text-xs"><span>0:00 / 1:32</span><span>เสียง • เต็มจอ</span></div></div></div></div>}
            {activeTab === 'cast' && <div><h3 className="text-base font-black md:text-xl">นักแสดงหลัก</h3><div className="movie-rail mt-3 flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-2 md:gap-3">{cast.map((person) => <div key={person.name} className="flex min-w-[190px] items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-2.5 md:min-w-0 md:p-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle,#6b1118,#171717)] text-sm font-black text-white md:h-12 md:w-12">{person.initial}</div><div className="min-w-0"><p className="line-clamp-1 text-sm font-black text-white md:text-base">{person.name}</p><p className="line-clamp-1 text-[11px] text-white/45 md:text-xs">รับบท {person.role}</p></div></div>)}</div></div>}
            {activeTab === 'recommend' && <div><h3 className="text-base font-black md:text-xl">แนะนำสำหรับคุณ</h3><div className="movie-rail mt-3 flex gap-2.5 overflow-x-auto pb-2 md:gap-4">{recommendations.slice(0, 8).map((movie, index) => <MovieCard key={`modal-rec-${movie.mediaType}-${movie.id}-${index}`} item={movie} compact onSelect={(nextItem) => { onSelect(nextItem); setActiveTab('detail'); setExpanded(false); }} priorityBadge={index % 2 === 0 ? 'แนะนำ' : undefined} />)}</div></div>}
            {activeTab === 'watch' && <div className="grid min-h-[210px] place-items-center text-center md:min-h-[260px]"><div className="max-w-md rounded-[22px] border border-[#e50914]/30 bg-[radial-gradient(circle_at_top,rgba(229,9,20,0.38),rgba(229,9,20,0.08)_35%,rgba(255,255,255,0.04)_100%)] p-5 md:rounded-[28px] md:p-7"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/70 md:text-xs">WATCH READY</p><h3 className="mt-2 text-xl font-black md:text-3xl">{item.watchUrl ? 'พร้อมรับชม' : 'ยังไม่มีลิงก์รับชม'}</h3><p className="mt-2 text-xs leading-5 text-white/58 md:text-sm md:leading-7">{item.watchUrl ? 'เรื่องนี้มีลิงก์พร้อมรับชม สามารถเปิดได้ทันทีจากทุกอุปกรณ์' : 'เรื่องนี้ยังไม่มีลิงก์รับชม สามารถดูตัวอย่างหรืออ่านรายละเอียดก่อน'}</p><a href={primaryHref} className={`mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl text-xs font-black text-white md:mt-6 md:h-12 md:text-sm ${item.watchUrl || item.trailerUrl ? 'bg-[#e50914] shadow-glow' : 'pointer-events-none bg-white/10 text-white/40'}`}>{ctaLabel(item)}</a><button onClick={reportIssue} className="mt-2 h-9 w-full rounded-xl border border-white/10 bg-black/35 text-xs font-black text-white/70 md:h-11 md:text-sm">แจ้งลิงก์เสีย</button></div></div>}
          </section>

          <aside className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 md:p-5"><h3 className="text-base font-black md:text-xl">เส้นทางรับชม</h3><div className="movie-rail mt-3 flex gap-2 overflow-x-auto md:mt-4 md:grid md:grid-cols-2 md:gap-3">{flowSteps.map((step, index) => <div key={step.title} className="flex min-w-[190px] items-center gap-2.5 md:min-w-0 md:gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e50914] text-xs font-black text-white md:h-9 md:w-9 md:text-sm">{index + 1}</span><div className="min-w-0"><p className="line-clamp-1 text-xs font-black text-white/80 md:text-sm">{step.title}</p><p className="line-clamp-1 text-[10px] font-bold text-white/35 md:text-xs">{step.caption}</p></div></div>)}</div>{reported ? <p className="mt-4 rounded-2xl border border-green-400/20 bg-green-400/10 p-3 text-xs font-bold text-green-100 md:text-sm">รับรายงานแล้ว ทีมแอดมินจะตรวจสอบลิงก์นี้</p> : null}</aside>
        </div>
      </div>
    </div>
  );
}
