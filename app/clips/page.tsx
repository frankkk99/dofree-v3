'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  type MediaClipLanguage,
  type MediaClipRow,
  type MediaClipSpoilerLevel,
  type MediaClipType,
} from '@/lib/media-clips';

type ClipsResponse = {
  ok?: boolean;
  clips?: MediaClipRow[];
  error?: string;
};

type CategoryOption = {
  id: string;
  label: string;
  type?: MediaClipType;
  language?: MediaClipLanguage;
};

type HelperItem = {
  label: string;
  q: string;
};

const categories: CategoryOption[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'shorts', label: 'Shorts', type: 'shorts' },
  { id: 'trailer', label: 'ตัวอย่าง', type: 'trailer' },
  { id: 'summary', label: 'สรุปหนัง', type: 'summary' },
  { id: 'spoiler', label: 'สปอย', type: 'spoiler' },
  { id: 'scene', label: 'ฉากเด็ด', type: 'scene' },
  { id: 'review', label: 'รีวิว', type: 'review' },
  { id: 'thai_dub', label: 'พากย์ไทย', language: 'thai_dub' },
  { id: 'thai_sub', label: 'ซับไทย', language: 'thai_sub' },
];

const helperGroups: Array<{ title: string; items: HelperItem[] }> = [
  {
    title: 'ค่าย / จักรวาล',
    items: [
      { label: 'Marvel', q: 'Marvel' },
      { label: 'DC', q: 'DC' },
      { label: 'HBO', q: 'HBO' },
      { label: 'Netflix', q: 'Netflix' },
      { label: 'Disney', q: 'Disney' },
      { label: 'Pixar', q: 'Pixar' },
      { label: 'Sony', q: 'Sony' },
      { label: 'Warner', q: 'Warner Bros' },
      { label: 'A24', q: 'A24' },
      { label: 'Ghibli', q: 'Studio Ghibli' },
    ],
  },
  {
    title: 'แนวหนัง',
    items: [
      { label: 'หนังผี', q: 'หนังผี' },
      { label: 'ผีเกาหลี', q: 'Korean horror' },
      { label: 'ซอมบี้', q: 'zombie' },
      { label: 'เอาชีวิตรอด', q: 'survival' },
      { label: 'ระทึกขวัญ', q: 'thriller' },
      { label: 'อาชญากรรม', q: 'crime' },
      { label: 'ปล้น', q: 'heist' },
      { label: 'สายลับ', q: 'spy' },
      { label: 'ฮีโร่', q: 'superhero' },
      { label: 'แฟนตาซี', q: 'fantasy' },
      { label: 'ไซไฟ', q: 'sci-fi' },
      { label: 'อวกาศ', q: 'space' },
      { label: 'ข้ามเวลา', q: 'time travel' },
      { label: 'โรแมนติก', q: 'romance' },
      { label: 'ครอบครัว', q: 'family' },
      { label: 'อนิเมะ', q: 'anime' },
      { label: 'สงคราม', q: 'war' },
      { label: 'สารคดี', q: 'documentary' },
      { label: 'หักมุม', q: 'plot twist' },
      { label: 'ล้างแค้น', q: 'revenge' },
      { label: 'ศาล', q: 'courtroom' },
      { label: 'ฆาตกร', q: 'serial killer' },
      { label: 'สร้างจากเรื่องจริง', q: 'true story' },
      { label: 'K-drama', q: 'K-drama' },
      { label: 'C-drama', q: 'C-drama' },
    ],
  },
];

const allHelpers = helperGroups.flatMap((group) => group.items);

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

function clipHref(clip: MediaClipRow) {
  return `/clips/feed?clip=${encodeURIComponent(clip.id)}`;
}

function queryPath(category: CategoryOption, q: string) {
  const params = new URLSearchParams({ limit: '60' });
  if (category.type) params.set('type', category.type);
  if (category.language) params.set('language', category.language);
  if (q.trim()) params.set('q', q.trim());
  return `/api/clips?${params.toString()}`;
}

function badgeTone(clip: MediaClipRow) {
  if (clip.spoiler_level === 'heavy') return 'bg-amber-300/18 text-amber-100 ring-amber-200/20';
  if (clip.clip_type === 'spoiler') return 'bg-orange-400/16 text-orange-100 ring-orange-200/20';
  return 'bg-[#e50914]/18 text-red-100 ring-[#e50914]/25';
}

function ClipCard({ clip, index }: { clip: MediaClipRow; index: number }) {
  const genres = clip.genres?.slice(0, 2).join(' · ');
  return (
    <a href={clipHref(clip)} className="group relative aspect-[3/4] min-h-[132px] overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.045] shadow-[0_16px_46px_rgba(0,0,0,0.42)] transition hover:-translate-y-1 hover:border-white/20 sm:min-h-[176px] md:min-h-[188px] md:rounded-[20px]">
      {clip.thumbnail_url ? (
        <img src={clip.thumbnail_url} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover blur-[1px] transition duration-500 group-hover:scale-115" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(229,9,20,0.55),transparent_18rem),linear-gradient(135deg,#151515,#030303)]" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.10),rgba(0,0,0,0.18)_34%,rgba(0,0,0,0.94))]" />
      <div className="absolute left-1.5 top-1.5 flex max-w-[calc(100%-2.8rem)] flex-wrap gap-1 md:left-2 md:top-2">
        <span className={`rounded-full px-1.5 py-0.5 text-[7px] font-black ring-1 backdrop-blur-xl md:px-2.5 md:py-1 md:text-[9px] ${badgeTone(clip)}`}>{clipTypeLabels[clip.clip_type]}</span>
        <span className="hidden rounded-full bg-black/48 px-2.5 py-1 text-[9px] font-black text-white/74 ring-1 ring-white/10 backdrop-blur-xl sm:inline-flex">{languageLabels[clip.language]}</span>
      </div>
      <div className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/46 text-[9px] font-black text-white/58 ring-1 ring-white/10 backdrop-blur-xl md:right-2 md:top-2 md:h-7 md:w-7 md:text-[10px]">{index + 1}</div>
      {clip.spoiler_level !== 'none' ? (
        <div className="absolute inset-x-[-18px] top-[42%] -rotate-12 bg-black/72 py-1.5 text-center text-[8px] font-black tracking-[0.12em] text-amber-100 shadow-[0_14px_36px_rgba(0,0,0,0.28)] ring-1 ring-amber-200/10 md:py-2 md:text-[10px]">
          {spoilerLabels[clip.spoiler_level]}
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 p-2 md:p-4">
        <h3 className="line-clamp-2 text-[10px] font-black leading-tight tracking-[-0.04em] text-white sm:text-xs md:text-lg">{clip.title}</h3>
        <p className="mt-0.5 line-clamp-1 text-[8px] font-bold text-white/56 sm:text-[10px] md:text-xs">{clip.media_title || 'คลิปแนะนำ'}</p>
        <p className="mt-0.5 hidden line-clamp-1 text-[10px] font-semibold text-white/34 md:block md:text-xs">{genres || 'เลือกดูจากคลิปสั้น'}</p>
      </div>
    </a>
  );
}

export default function ClipsPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryOption>(categories[0]);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [clips, setClips] = useState<MediaClipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const apiUrl = useMemo(() => queryPath(activeCategory, query), [activeCategory, query]);
  const resultTitle = query.trim() ? `ผลลัพธ์: ${query}` : activeCategory.label === 'ทั้งหมด' ? 'คลิปแนะนำทั้งหมด' : activeCategory.label;

  useEffect(() => {
    let active = true;
    async function loadClips() {
      setLoading(true);
      setMessage('');
      try {
        const response = await fetch(apiUrl, { cache: 'no-store' });
        const payload = await response.json() as ClipsResponse;
        if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลดคลิปไม่ได้');
        if (active) setClips(payload.clips || []);
      } catch (error) {
        if (active) {
          setClips([]);
          setMessage(error instanceof Error ? error.message : 'โหลดคลิปไม่ได้');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadClips();
    return () => {
      active = false;
    };
  }, [apiUrl]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(input.trim());
  }

  function pickCategory(category: CategoryOption) {
    setActiveCategory(category);
    setQuery('');
    setInput('');
  }

  function pickHelper(helper: HelperItem) {
    setActiveCategory(categories[0]);
    setInput(helper.q);
    setQuery(helper.q);
  }

  function clearSearch() {
    setActiveCategory(categories[0]);
    setInput('');
    setQuery('');
  }

  return (
    <main className="min-h-screen bg-[#030303] pb-24 text-white md:pb-14">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/88 px-3 py-3 backdrop-blur-2xl md:px-7 md:py-4">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
          <a href="/" className="text-xl font-black tracking-[-0.06em] text-[#e50914] md:text-3xl">ดูดีดี.online</a>
          <a href="/" className="rounded-full bg-white/[0.08] px-4 py-2 text-xs font-black text-white/68 transition hover:bg-white/[0.14] hover:text-white">กลับหน้าแรก</a>
        </div>
      </header>

      <section className="mx-auto max-w-[1440px] px-3 py-3 md:px-7 md:py-5">
        <div className="rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(229,9,20,0.16),transparent_22rem),rgba(255,255,255,0.03)] p-3 shadow-[0_20px_80px_rgba(0,0,0,0.50),inset_0_1px_0_rgba(255,255,255,0.08)] md:rounded-[30px] md:p-5">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#e50914]/90 md:text-[10px]">Clips</p>
              <h1 className="mt-1 text-[24px] font-black leading-none tracking-[-0.07em] md:text-5xl">คลิปสั้นก่อนเลือกดู</h1>
              <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-5 text-white/52 md:text-sm md:leading-6">ค้นหาชื่อเรื่อง แนว ค่าย หรืออารมณ์ แล้วดูตัวอย่าง สรุป หรือสปอยก่อนตัดสินใจ</p>
            </div>
            <span className="hidden h-9 shrink-0 items-center rounded-full bg-white/[0.07] px-4 text-xs font-black text-white/48 ring-1 ring-white/8 sm:inline-flex">{loading ? 'โหลด' : `${clips.length} คลิป`}</span>
          </div>

          <form onSubmit={submitSearch} className="mt-3 flex h-11 items-center gap-2 rounded-[18px] bg-black/26 p-1.5 ring-1 ring-white/10 md:h-12">
            <span className="pl-2 text-white/45">⌕</span>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Marvel / DC / HBO / หนังผีเกาหลี"
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/34"
            />
            <button className="h-8 shrink-0 rounded-[13px] bg-[#e50914] px-3 text-[11px] font-black text-white shadow-[0_12px_34px_rgba(229,9,20,0.28)] md:h-9 md:px-5 md:text-xs" type="submit">ค้นหา</button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-3 md:hidden">
        <div className="movie-rail flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button key={category.id} type="button" onClick={() => pickCategory(category)} className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-black ring-1 ${activeCategory.id === category.id && !query ? 'bg-[#e50914] text-white ring-[#e50914]' : 'bg-white/[0.07] text-white/64 ring-white/10'}`}>{category.label}</button>
          ))}
          {allHelpers.map((helper) => (
            <button key={helper.q} type="button" onClick={() => pickHelper(helper)} className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-black ring-1 ${query === helper.q ? 'bg-[#e50914]/18 text-white ring-[#e50914]/40' : 'bg-white/[0.07] text-white/64 ring-white/10'}`}>{helper.label}</button>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-3 px-3 pb-10 md:grid-cols-[170px_minmax(0,1fr)] md:gap-5 md:px-7 md:pb-14">
        <aside className="sticky top-[82px] hidden self-start md:block">
          <div className="flex max-h-[calc(100vh-96px)] min-h-[520px] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.44)]">
            <div className="mb-2 px-1">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#e50914]/85">ค้นหาไว</p>
              <p className="mt-1 text-[10px] font-bold leading-4 text-white/42">เลือกหมวดหรือคีย์เวิร์ด</p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-2">
                <div>
                  <p className="mb-1.5 px-1 text-[10px] font-black text-white/32">หลัก</p>
                  <div className="grid gap-1.5">
                    {categories.map((category) => (
                      <button key={category.id} type="button" onClick={() => pickCategory(category)} className={`rounded-2xl px-3 py-2.5 text-left text-[11px] font-black leading-4 ring-1 transition ${activeCategory.id === category.id && !query ? 'bg-[#e50914] text-white ring-[#e50914] shadow-[0_12px_30px_rgba(229,9,20,0.22)]' : 'bg-white/[0.06] text-white/68 ring-white/10 hover:bg-white/[0.10] hover:text-white'}`}>{category.label}</button>
                    ))}
                  </div>
                </div>

                {helperGroups.map((group) => (
                  <div key={group.title} className="pt-1">
                    <p className="mb-1.5 px-1 text-[10px] font-black text-white/32">{group.title}</p>
                    <div className="grid gap-1.5">
                      {group.items.map((helper) => (
                        <button key={helper.q} type="button" onClick={() => pickHelper(helper)} className={`rounded-2xl border px-3 py-2 text-left text-[11px] font-black leading-4 transition ${query === helper.q ? 'border-[#e50914]/45 bg-[#e50914]/12 text-white' : 'border-white/10 bg-white/[0.04] text-white/64 hover:border-white/16 hover:bg-white/[0.07] hover:text-white'}`}>{helper.label}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#e50914]/80 md:text-[10px]">Watch Guide</p>
              <h2 className="mt-1 truncate text-xl font-black tracking-[-0.05em] md:text-4xl">{resultTitle}</h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {(query || activeCategory.id !== 'all') ? <button type="button" onClick={clearSearch} className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[10px] font-black text-white/52 ring-1 ring-white/8">ล้าง</button> : null}
              <span className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[10px] font-black text-white/45 ring-1 ring-white/8">{loading ? 'โหลด' : `${clips.length}`}</span>
            </div>
          </div>

          {message ? <p className="mt-3 rounded-2xl bg-white/[0.06] p-4 text-sm font-black text-white/54 ring-1 ring-white/10">{message}</p> : null}
          {!loading && !clips.length ? (
            <div className="mt-3 rounded-[22px] border border-white/10 bg-white/[0.035] p-5 text-center shadow-[0_16px_50px_rgba(0,0,0,0.36)] md:rounded-[26px] md:p-8">
              <p className="text-base font-black tracking-[-0.04em] text-white md:text-lg">ยังไม่มีคลิปในหมวดนี้</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/42 md:text-sm md:leading-6">ลองเลือกหมวดอื่น หรือเปิด Feed รวมก่อนได้</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={clearSearch} className="rounded-full bg-[#e50914] px-4 py-2 text-[10px] font-black text-white">ทั้งหมด</button>
                {allHelpers.slice(0, 4).map((helper) => <button key={helper.q} type="button" onClick={() => pickHelper(helper)} className="rounded-full bg-white/[0.08] px-4 py-2 text-[10px] font-black text-white/62 ring-1 ring-white/10">{helper.label}</button>)}
                <a href="/clips/feed" className="rounded-full bg-white/[0.08] px-4 py-2 text-[10px] font-black text-white/62 ring-1 ring-white/10">เปิด Feed</a>
              </div>
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-3 gap-2 md:mt-4 md:grid-cols-3 md:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
            {loading ? Array.from({ length: 9 }).map((_, index) => <div key={index} className="aspect-[3/4] min-h-[132px] animate-pulse rounded-[14px] bg-white/[0.045] sm:min-h-[176px] md:min-h-[188px] md:rounded-[20px]" />) : clips.map((clip, index) => <ClipCard key={clip.id} clip={clip} index={index} />)}
          </div>
        </div>
      </section>
    </main>
  );
}
