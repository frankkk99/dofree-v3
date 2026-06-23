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
  { id: 'detail', label: 'รายละเอียด' },
  { id: 'teaser', label: 'ตัวอย่าง' },
  { id: 'cast', label: 'นักแสดง' },
  { id: 'recommend', label: 'แนะนำ' },
  { id: 'watch', label: 'พร้อมรับชม' },
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
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/90 px-3 py-4 text-white backdrop-blur-2xl md:px-5 md:py-6" role="dialog" aria-modal="true">
      <div className="mx-auto max-w-[1780px] overflow-hidden rounded-[30px] border border-white/10 bg-[#050505] shadow-[0_50px_150px_rgba(0,0,0,0.9)]">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(229,9,20,0.26),transparent_33rem)] p-5 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-white/55">ประสบการณ์ใช้งานบนมือถือ | Movie Website</p>
              <h2 className="mt-2 text-3xl font-black leading-tight tracking-[-0.055em] md:text-5xl">เส้นทางการ<span className="text-[#e50914]">ค้นหาและรับชม</span>ภาพยนตร์</h2>
              <p className="mt-2 max-w-2xl text-sm font-bold text-white/45">ค้นหา ดูข้อมูล ตัดสินใจ และพร้อมรับชมในไม่กี่ขั้นตอน</p>
            </div>
            <button onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-2xl font-black text-white/80 hover:bg-white/10" aria-label="ปิดหน้าต่างค้นหา">×</button>
          </div>

          <FlowPath />
          <MiniJourneyPreview items={items} onSelect={(item) => { onClose(); onSelect(item); }} />

          <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_360px]">
            <div>
              <label className="flex h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.08] px-5 shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
                <span className="text-2xl text-[#e50914]">⌕</span>
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ค้นหาภาพยนตร์, ซีรีส์, นักแสดง, หมวดหมู่"
                  className="w-full bg-transparent text-base font-bold text-white outline-none placeholder:text-white/35"
                />
              </label>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-black text-white/55">
                {['ทั้งหมด', 'ภาพยนตร์', 'ซีรีส์', 'นักแสดง', 'ผู้กำกับ'].map((tab, index) => (
                  <span key={tab} className={`rounded-full border px-4 py-2 ${index === 0 ? 'border-[#e50914] bg-[#e50914]/18 text-red-100' : 'border-white/10 bg-white/[0.04]'}`}>{tab}</span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e50914]/20 bg-[#e50914]/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-100/70">Watch Ready</p>
              <h3 className="mt-2 text-xl font-black">พร้อมรับชม</h3>
              <p className="mt-1 text-sm text-white/55">เลือกเรื่องที่มีสถานะพร้อมดู แล้วกดรับชมได้ทันที</p>
              <a href="/watch-ready" className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-[#e50914] px-5 text-sm font-black text-white shadow-glow">ดูทั้งหมด</a>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 md:p-7 lg:grid-cols-[1fr_360px]">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-black">ผลการค้นหา</h3>
              <p className="text-sm font-bold text-white/40">พบ {filteredItems.length} เรื่อง</p>
            </div>
            <div className="space-y-3">
              {filteredItems.length ? filteredItems.map((item) => (
                <button
                  key={`search-${item.mediaType}-${item.id}`}
                  onClick={() => { onClose(); onSelect(item); }}
                  className="group grid w-full grid-cols-[92px_1fr_auto] items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-[#e50914]/70 hover:bg-[#e50914]/10"
                >
                  <div className="relative h-28 overflow-hidden rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${item.posterUrl})` }} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      {(item.badges || []).slice(0, 3).map((badge) => <span key={badge} className="rounded bg-[#e50914] px-2 py-1 text-[10px] font-black text-white">{badge}</span>)}
                    </div>
                    <h4 className="mt-2 line-clamp-1 text-lg font-black text-white">{item.title}</h4>
                    <p className="mt-1 text-sm font-bold text-white/45">{item.year} • {item.mediaType === 'tv' ? 'Series' : 'Movie'} • ★ {item.rating.toFixed(1)}</p>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/45">{item.overview}</p>
                  </div>
                  <span className="hidden text-3xl text-[#e50914] transition group-hover:translate-x-1 md:block">›</span>
                </button>
              )) : <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-white/55">ไม่พบผลลัพธ์ ลองค้นชื่อเรื่องหรือหมวดอื่น</div>}
            </div>
          </section>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h3 className="text-lg font-black">แนะนำสำหรับคุณ</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {watchReady.map((item) => (
                <button key={`ready-${item.mediaType}-${item.id}`} onClick={() => { onClose(); onSelect(item); }} className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-left hover:border-[#e50914]/70">
                  <div className="aspect-[2/3] rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${item.posterUrl})` }} />
                  <p className="mt-2 line-clamp-1 text-xs font-black text-white">{item.title}</p>
                  <p className="text-[11px] font-bold text-[#f4c46b]">{Math.round(Math.min(98, item.rating * 10 + 8))}% แนะนำ</p>
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
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/84 px-3 py-5 text-white backdrop-blur-2xl" role="dialog" aria-modal="true">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-[#050505] shadow-[0_50px_150px_rgba(0,0,0,0.92)]">
        <div className="relative min-h-[260px] border-b border-white/10 bg-black md:min-h-[340px]">
          <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url(${item.backdropUrl || item.posterUrl})` }} />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#050505_0%,rgba(5,5,5,0.86)_34%,rgba(5,5,5,0.25)_70%,#050505_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),#050505_100%)]" />
          <button onClick={onClose} className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/70 text-2xl font-black text-white/80 hover:bg-white/10" aria-label="ปิดรายละเอียด">×</button>
          <div className="relative z-10 grid gap-6 p-5 md:grid-cols-[210px_1fr] md:p-8">
            <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.75)] md:block">
              <img src={item.posterUrl} alt={item.title} className="h-full min-h-[300px] w-full object-cover" />
            </div>
            <div className="flex min-h-[280px] flex-col justify-end">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#e50914]">{item.mediaType === 'tv' ? 'Series Window' : 'Movie Window'}</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.9] tracking-[-0.075em] text-white md:text-7xl">{item.title}</h2>
              <p className="mt-4 max-w-3xl text-base font-bold leading-8 text-white/62">{item.overview}</p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-black text-white/75">
                <span className="rounded-full bg-white/10 px-3 py-1">{item.year}</span>
                <span className="rounded-full bg-white/10 px-3 py-1">★ {item.rating.toFixed(1)}</span>
                {item.runtime ? <span className="rounded-full bg-white/10 px-3 py-1">{item.runtime} นาที</span> : null}
                <span className="rounded-full bg-[#e50914]/20 px-3 py-1 text-red-100">{item.status === 'published' ? 'พร้อมรับชม' : item.status || 'preview'}</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={primaryHref} className={`inline-flex h-12 items-center gap-3 rounded-xl px-6 text-sm font-black text-white ${item.watchUrl || item.trailerUrl ? 'bg-[#e50914] shadow-glow' : 'pointer-events-none bg-white/10 text-white/40'}`}>▶ {ctaLabel(item)}</a>
                <button onClick={() => setActiveTab('teaser')} className="inline-flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.1] px-6 text-sm font-black text-white/82 hover:bg-white/[0.16]">ตัวอย่าง</button>
                <button onClick={reportIssue} className="inline-flex h-12 items-center gap-3 rounded-xl border border-[#e50914]/30 bg-[#e50914]/10 px-6 text-sm font-black text-red-100 hover:bg-[#e50914]/18">แจ้งลิงก์เสีย</button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-white/10 bg-black/80 px-4 md:px-8">
          <div className="movie-rail flex gap-2 overflow-x-auto py-3">
            {modalTabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`min-w-max rounded-full px-5 py-2 text-sm font-black transition ${activeTab === tab.id ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.06] text-white/55 hover:bg-white/[0.1] hover:text-white'}`}>{tab.label}</button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 p-5 md:p-8 lg:grid-cols-[1fr_330px]">
          <section className="min-h-[330px] rounded-3xl border border-white/10 bg-white/[0.035] p-5 md:p-6">
            {activeTab === 'detail' && <div><h3 className="text-2xl font-black">เกี่ยวกับภาพยนตร์</h3><div className="mt-5 grid gap-4 text-sm font-bold text-white/62 md:grid-cols-2"><p>ประเภท: {(item.genres || []).join(', ') || 'ภาพยนตร์'}</p><p>ความยาว: {item.runtime ? `${item.runtime} นาที` : 'ยังไม่มีข้อมูล'}</p><p>วันฉาย: {item.year}</p><p>ภาษา: {item.language === 'th' ? 'ไทย' : item.language || 'ไม่ระบุ'}</p><p>สถานะ: {item.status === 'published' ? 'พร้อมรับชม' : item.status || 'preview'}</p><p>คะแนน: {item.rating.toFixed(1)} / 10</p></div><p className="mt-6 max-w-3xl text-base leading-8 text-white/58">{item.overview}</p></div>}
            {activeTab === 'teaser' && <div><h3 className="text-2xl font-black">ตัวอย่างภาพยนตร์</h3><div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black"><div className="relative aspect-video bg-cover bg-center" style={{ backgroundImage: `url(${item.backdropUrl || item.posterUrl})` }}><div className="absolute inset-0 bg-black/45" /><a href={item.trailerUrl || `/${item.mediaType}/${item.id}`} className="absolute inset-0 grid place-items-center"><span className="grid h-20 w-20 place-items-center rounded-full bg-[#e50914] text-3xl font-black text-white shadow-glow">▶</span></a><div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black to-transparent p-4 text-sm font-bold text-white/70"><span>0:00 / 1:32</span><span>เสียง • เต็มจอ</span></div></div></div></div>}
            {activeTab === 'cast' && <div><h3 className="text-2xl font-black">นักแสดงหลัก</h3><div className="mt-5 grid gap-3 sm:grid-cols-2">{cast.map((person) => <div key={person.name} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/30 p-3"><div className="grid h-14 w-14 place-items-center rounded-full bg-[radial-gradient(circle,#6b1118,#171717)] text-lg font-black text-white">{person.initial}</div><div><p className="font-black text-white">{person.name}</p><p className="text-sm text-white/45">รับบท {person.role}</p></div></div>)}</div></div>}
            {activeTab === 'recommend' && <div><h3 className="text-2xl font-black">แนะนำสำหรับคุณ</h3><div className="movie-rail mt-5 flex gap-4 overflow-x-auto pb-2">{recommendations.slice(0, 8).map((movie, index) => <MovieCard key={`modal-rec-${movie.mediaType}-${movie.id}-${index}`} item={movie} compact onSelect={(nextItem) => { onSelect(nextItem); setActiveTab('detail'); }} priorityBadge={index % 2 === 0 ? 'แนะนำ' : undefined} />)}</div></div>}
            {activeTab === 'watch' && <div className="grid min-h-[280px] place-items-center text-center"><div className="max-w-md rounded-[28px] border border-[#e50914]/30 bg-[radial-gradient(circle_at_top,rgba(229,9,20,0.38),rgba(229,9,20,0.08)_35%,rgba(255,255,255,0.04)_100%)] p-7"><p className="text-sm font-black uppercase tracking-[0.26em] text-red-100/70">WATCH READY</p><h3 className="mt-3 text-3xl font-black">{item.watchUrl ? 'พร้อมรับชม' : 'ยังไม่มีลิงก์รับชม'}</h3><p className="mt-2 text-sm leading-7 text-white/58">{item.watchUrl ? 'เรื่องนี้มีลิงก์พร้อมรับชม สามารถเปิดได้ทันทีจากทุกอุปกรณ์' : 'เรื่องนี้ยังไม่มีลิงก์รับชม สามารถดูตัวอย่างหรืออ่านรายละเอียดก่อน'}</p><a href={primaryHref} className={`mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl text-sm font-black text-white ${item.watchUrl || item.trailerUrl ? 'bg-[#e50914] shadow-glow' : 'pointer-events-none bg-white/10 text-white/40'}`}>{ctaLabel(item)}</a><button className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-black/35 text-sm font-black text-white/70">+ ลิสต์ของฉัน</button></div></div>}
          </section>

          <aside className="rounded-3xl border border-white/10 bg-white/[0.035] p-5"><h3 className="text-xl font-black">เส้นทางรับชม</h3><div className="mt-4 space-y-3">{flowSteps.map((step, index) => <div key={step.title} className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#e50914] text-sm font-black text-white">{index + 1}</span><div><p className="font-black text-white/80">{step.title}</p><p className="text-xs font-bold text-white/35">{step.caption}</p></div></div>)}</div>{reported ? <p className="mt-5 rounded-2xl border border-green-400/20 bg-green-400/10 p-3 text-sm font-bold text-green-100">รับรายงานแล้ว ทีมแอดมินจะตรวจสอบลิงก์นี้</p> : null}</aside>
        </div>
      </div>
    </div>
  );
}
