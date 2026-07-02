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
  { id: 'english', label: 'อังกฤษ', language: 'english' },
];

const helperSearches = [
  'Marvel', 'DC', 'HBO', 'Netflix', 'Disney', 'Pixar', 'Sony', 'Warner Bros', 'Paramount', 'Universal',
  'A24', 'Studio Ghibli', 'Korean horror', 'Thai horror', 'Japanese horror', 'zombie', 'survival', 'thriller', 'crime', 'heist',
  'spy', 'superhero', 'fantasy', 'sci-fi', 'space', 'time travel', 'romance', 'rom-com', 'family', 'animation',
  'anime', 'coming of age', 'biography', 'historical', 'war', 'documentary', 'feel good', 'mind-bending', 'plot twist', 'slow burn',
  'revenge', 'courtroom', 'serial killer', 'true story', 'musical', 'western', 'K-drama', 'C-drama', 'พากย์ไทย', 'ซับไทย',
];

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
    <a href={clipHref(clip)} className="group relative aspect-[3/4] min-h-[188px] overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.045] shadow-[0_20px_70px_rgba(0,0,0,0.48)] transition hover:-translate-y-1 hover:border-white/20">
      {clip.thumbnail_url ? (
        <img src={clip.thumbnail_url} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover blur-[1px] transition duration-500 group-hover:scale-115" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(229,9,20,0.55),transparent_18rem),linear-gradient(135deg,#151515,#030303)]" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.10),rgba(0,0,0,0.18)_34%,rgba(0,0,0,0.94))]" />
      <div className="absolute left-2 top-2 flex max-w-[calc(100%-3.4rem)] flex-wrap gap-1">
        <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ring-1 backdrop-blur-xl ${badgeTone(clip)}`}>{clipTypeLabels[clip.clip_type]}</span>
        <span className="rounded-full bg-black/48 px-2.5 py-1 text-[9px] font-black text-white/74 ring-1 ring-white/10 backdrop-blur-xl">{languageLabels[clip.language]}</span>
      </div>
      <div className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/46 text-[10px] font-black text-white/58 ring-1 ring-white/10 backdrop-blur-xl">{index + 1}</div>
      {clip.spoiler_level !== 'none' ? (
        <div className="absolute inset-x-[-18px] top-[42%] -rotate-12 bg-black/72 py-2 text-center text-[10px] font-black tracking-[0.12em] text-amber-100 shadow-[0_14px_36px_rgba(0,0,0,0.28)] ring-1 ring-amber-200/10">
          {spoilerLabels[clip.spoiler_level]}
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 p-3 md:p-4">
        <h3 className="line-clamp-2 text-sm font-black leading-tight tracking-[-0.04em] text-white md:text-lg">{clip.title}</h3>
        <p className="mt-1 line-clamp-1 text-[10px] font-bold text-white/56 md:text-xs">{clip.media_title || 'คลิปแนะนำ'}</p>
        <p className="mt-1 line-clamp-1 text-[10px] font-semibold text-white/34 md:text-xs">{genres || 'เลือกดูจากคลิปสั้น'}</p>
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

  function pickQuickSearch(label: string) {
    setInput(label);
    setQuery(label);
  }

  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/88 px-4 py-3 backdrop-blur-2xl md:px-7 md:py-4">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
          <a href="/" className="text-xl font-black tracking-[-0.06em] text-[#e50914] md:text-3xl">ดูดีดี.online</a>
          <a href="/" className="rounded-full bg-white/[0.08] px-4 py-2 text-xs font-black text-white/68 transition hover:bg-white/[0.14] hover:text-white">กลับหน้าแรก</a>
        </div>
      </header>

      <section className="mx-auto max-w-[1440px] px-4 py-5 md:px-7 md:py-7">
        <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(229,9,20,0.16),transparent_22rem),rgba(255,255,255,0.03)] p-4 shadow-[0_28px_100px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] md:rounded-[34px] md:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e50914]/90">Clips</p>
          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-[28px] font-black leading-none tracking-[-0.07em] md:text-5xl">คลิปสั้นก่อนเลือกดู</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-white/56 md:text-base md:leading-7">ค้นหาด้วยชื่อเรื่อง แนว อารมณ์ หรือค่ายหนัง แล้วเลือกดูคลิปสั้น ตัวอย่าง สรุป หรือสปอยก่อนตัดสินใจ</p>
            </div>
            <span className="inline-flex h-10 items-center rounded-full bg-white/[0.07] px-4 text-xs font-black text-white/48 ring-1 ring-white/8">{loading ? 'กำลังโหลด' : `${clips.length} คลิป`}</span>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] grid-cols-[120px_minmax(0,1fr)] gap-3 px-4 pb-10 md:grid-cols-[132px_minmax(0,1fr)] md:gap-5 md:px-7 md:pb-14">
        <aside className="sticky top-[82px] self-start">
          <div className="flex h-[calc(100vh-96px)] min-h-[520px] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-2.5 shadow-[0_18px_60px_rgba(0,0,0,0.44)]">
            <div className="mb-2 px-1">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#e50914]/85">ค้นหาไว</p>
              <p className="mt-1 text-[10px] font-bold leading-4 text-white/42">จิ้มแล้วการ์ดด้านขวาจะเปลี่ยนทันที</p>
            </div>

            <div className="grid gap-1.5">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-2xl px-2.5 py-2.5 text-[11px] font-black leading-4 ring-1 transition ${activeCategory.id === category.id ? 'bg-[#e50914] text-white ring-[#e50914] shadow-[0_12px_30px_rgba(229,9,20,0.22)]' : 'bg-white/[0.06] text-white/68 ring-white/10 hover:bg-white/[0.10] hover:text-white'}`}
                >
                  {category.label}
                </button>
              ))}
            </div>

            <div className="mt-2 h-px bg-white/8" />

            <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-1.5">
                {helperSearches.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => pickQuickSearch(label)}
                    className={`rounded-2xl border px-2.5 py-2 text-left text-[11px] font-black leading-4 transition ${query === label ? 'border-[#e50914]/45 bg-[#e50914]/12 text-white' : 'border-white/10 bg-white/[0.04] text-white/64 hover:border-white/16 hover:bg-white/[0.07] hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(229,9,20,0.12),transparent_18rem),rgba(255,255,255,0.03)] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.42)] md:p-4">
            <form onSubmit={submitSearch} className="flex items-center gap-2 rounded-[22px] bg-black/26 p-2 ring-1 ring-white/10">
              <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[16px] bg-white/[0.08] px-3 ring-1 ring-white/8 md:h-12">
                <span className="text-white/45">⌕</span>
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="หนังผีเกาหลี / Marvel / พากย์ไทย / สรุปหนังรัก"
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/34"
                />
              </label>
              <button className="h-11 shrink-0 rounded-[16px] bg-[#e50914] px-4 text-xs font-black text-white shadow-[0_16px_44px_rgba(229,9,20,0.30)] md:h-12 md:px-5" type="submit">ค้นหา</button>
            </form>
            <p className="mt-2 px-1 text-[11px] font-bold leading-5 text-white/36">ระบบค้นหานี้กำลังขยายฐานข้อมูลและคำค้นเพิ่มเติมอยู่ ลองพิมพ์ชื่อเรื่อง แนวหนัง ค่าย หรือภาษาที่อยากดูได้เลย</p>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3 md:mt-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e50914]/80">Watch Guide</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.05em] md:text-4xl">
                {query.trim() ? `ผลลัพธ์: ${query}` : activeCategory.label === 'ทั้งหมด' ? 'คลิปแนะนำทั้งหมด' : activeCategory.label}
              </h2>
            </div>
            <span className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[10px] font-black text-white/45 ring-1 ring-white/8">{loading ? 'กำลังโหลด' : `${clips.length} คลิป`}</span>
          </div>

          {message ? <p className="mt-3 rounded-2xl bg-white/[0.06] p-4 text-sm font-black text-white/54 ring-1 ring-white/10">{message}</p> : null}
          {!loading && !clips.length ? (
            <div className="mt-3 rounded-[26px] border border-white/10 bg-white/[0.035] p-6 text-center shadow-[0_16px_50px_rgba(0,0,0,0.36)] md:p-8">
              <p className="text-lg font-black tracking-[-0.04em] text-white">ยังไม่มีคลิปในหมวดนี้</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/42">ลองจิ้มตัวช่วยทางซ้าย หรือค้นหาคำอื่นได้เลย</p>
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2.5 md:mt-4 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
            {loading ? Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-[3/4] min-h-[188px] animate-pulse rounded-[20px] bg-white/[0.045]" />) : clips.map((clip, index) => <ClipCard key={clip.id} clip={clip} index={index} />)}
          </div>
        </div>
      </section>
    </main>
  );
}
