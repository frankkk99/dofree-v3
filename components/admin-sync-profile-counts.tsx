'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminSessionHeaders } from '@/lib/admin-session-browser';

type ProfileStat = {
  profileId: string;
  label: string;
  shortLabel: string;
  description: string;
  sourceBucket: string;
  mediaType: 'movie' | 'tv' | 'both';
  kind: string;
  targetCount: number;
  existingCount: number;
  movieCount: number;
  seriesCount: number;
  missingPoster: number;
  missingBackdrop: number;
  missingMetadata: number;
  rating7Count: number;
  estimatedNeed: number;
  latestSyncedAt: string | null;
  recommendedAction: 'sync-now' | 'enrich' | 'add-more' | 'ok';
  recommendedLabel: string;
};

type CountsPayload = {
  ok?: boolean;
  stats?: ProfileStat[];
  error?: string;
};

const actionTone: Record<string, string> = {
  'sync-now': 'border-red-300/20 bg-red-400/[0.085] text-red-100',
  enrich: 'border-zinc-200/20 bg-zinc-200/[0.075] text-zinc-100',
  'add-more': 'border-white/14 bg-white/[0.075] text-white/80',
  ok: 'border-emerald-300/18 bg-emerald-300/[0.075] text-emerald-100',
};

function fmt(value: number) {
  return new Intl.NumberFormat('th-TH').format(Number(value || 0));
}

function dateText(value: string | null) {
  if (!value) return 'ยังไม่เคย Sync';
  try {
    return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

function groupOf(stat: ProfileStat) {
  const bucket = stat.sourceBucket.toLowerCase();
  if (['netflix', 'disney', 'hbo', 'prime', 'apple'].includes(bucket)) return 'Provider';
  if (['thai', 'korea', 'japan', 'china', 'indian', 'spanish', 'anime'].includes(bucket)) return 'ภาษา / ประเทศ';
  if (['marvel', 'dc'].includes(bucket)) return 'จักรวาล / ค่าย';
  if (['action', 'horror', 'comedy', 'romance', 'sci-fi', 'crime', 'family', 'documentary', 'animation'].includes(bucket)) return 'แนวหนัง';
  if (stat.mediaType === 'tv') return 'ซีรีส์';
  return 'พื้นฐาน';
}

function scorePercent(stat: ProfileStat) {
  if (!stat.targetCount) return 0;
  return Math.max(0, Math.min(100, Math.round((stat.existingCount / stat.targetCount) * 100)));
}

function ProfileCountCard({ stat }: { stat: ProfileStat }) {
  const percent = scorePercent(stat);
  return (
    <article className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition hover:bg-white/[0.065]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black tracking-[-0.03em] text-white">{stat.shortLabel}</p>
          <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-white/42">{stat.description}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${actionTone[stat.recommendedAction] || actionTone.ok}`}>{stat.recommendedLabel}</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-black/30 p-2">
          <p className="text-[10px] font-black text-white/36">มีแล้ว</p>
          <p className="mt-1 text-lg font-black text-white">{fmt(stat.existingCount)}</p>
        </div>
        <div className="rounded-2xl bg-black/30 p-2">
          <p className="text-[10px] font-black text-white/36">ควรเติม</p>
          <p className="mt-1 text-lg font-black text-white/78">{fmt(stat.estimatedNeed)}</p>
        </div>
        <div className="rounded-2xl bg-black/30 p-2">
          <p className="text-[10px] font-black text-white/36">7+</p>
          <p className="mt-1 text-lg font-black text-emerald-100">{fmt(stat.rating7Count)}</p>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div className="h-full rounded-full bg-white/80" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold text-white/42">
        <span>Movie {fmt(stat.movieCount)}</span>
        <span>TV {fmt(stat.seriesCount)}</span>
        <span>ขาดรูป {fmt(stat.missingPoster + stat.missingBackdrop)}</span>
        <span>ขาด Meta {fmt(stat.missingMetadata)}</span>
      </div>
      <p className="mt-3 truncate rounded-full bg-black/24 px-3 py-1.5 text-[10px] font-semibold text-white/35">ล่าสุด: {dateText(stat.latestSyncedAt)}</p>
    </article>
  );
}

export function AdminSyncProfileCounts() {
  const [stats, setStats] = useState<ProfileStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const groupedStats = useMemo(() => {
    const map = new Map<string, ProfileStat[]>();
    for (const stat of stats) {
      const group = groupOf(stat);
      map.set(group, [...(map.get(group) || []), stat]);
    }
    const order = ['พื้นฐาน', 'Provider', 'ภาษา / ประเทศ', 'จักรวาล / ค่าย', 'แนวหนัง', 'ซีรีส์'];
    return [...map.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [stats]);

  async function loadCounts() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/sync/profile-counts', {
        headers: adminSessionHeaders(),
        cache: 'no-store',
      });
      const payload = (await response.json()) as CountsPayload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลดตัวเลขรายหมวดไม่สำเร็จ');
      setStats(Array.isArray(payload.stats) ? payload.stats : []);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'โหลดตัวเลขรายหมวดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCounts();
  }, []);

  return (
    <section className="mx-auto mb-5 max-w-7xl rounded-[28px] border border-white/[0.075] bg-black/[0.38] p-4 text-white shadow-[0_24px_100px_rgba(0,0,0,0.56),inset_0_1px_0_rgba(255,255,255,0.055)] backdrop-blur-2xl md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.065] pb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">Decision Counts</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.045em] text-white">ตัวเลขก่อนเลือก Sync</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/42">ดูจำนวนข้อมูลที่มีอยู่แล้วในแต่ละหมวดก่อนตัดสินใจว่าจะดึงเพิ่ม เติม metadata หรือข้ามไปก่อน</p>
        </div>
        <button type="button" onClick={() => void loadCounts()} disabled={loading} className="h-10 rounded-2xl border border-white/[0.09] bg-white/[0.055] px-4 text-xs font-black text-white/68 hover:bg-white/[0.09] hover:text-white disabled:opacity-45">รีเฟรชตัวเลข</button>
      </div>

      {loading ? <p className="mt-4 rounded-2xl bg-white/[0.04] p-4 text-sm font-bold text-white/45">กำลังโหลดตัวเลขรายหมวด...</p> : null}
      {error ? <p className="mt-4 rounded-2xl border border-red-300/15 bg-red-400/[0.08] p-4 text-sm font-bold text-red-100">{error}</p> : null}

      {!loading && !error ? (
        <div className="mt-5 space-y-5">
          {groupedStats.map(([group, items]) => (
            <div key={group}>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/30">{group}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((stat) => <ProfileCountCard key={stat.profileId} stat={stat} />)}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
