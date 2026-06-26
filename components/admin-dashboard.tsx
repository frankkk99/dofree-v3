'use client';

import { useEffect, useMemo, useState } from 'react';
import { getStoredSession } from '@/lib/supabase-auth-browser';

type Metrics = {
  totalCatalog: number;
  readyLinks: number;
  missingLinks: number;
  brokenLinks: number;
  users: number;
  favorites: number;
  watchHistory: number;
  memberships: number;
  premiumMembers: number;
  reports: number;
  reports7d: number;
  sections: number;
  categories: number;
  visitorsToday: number;
  visitors7d: number;
  pageViewsToday: number;
  pageViews7d: number;
  watchClicks7d: number;
  detailOpens7d: number;
  searches7d: number;
  totalEvents7d: number;
};

type Task = {
  title: string;
  value: number;
  tone: string;
};

type MissingSample = {
  tmdb_id: number;
  media_type: string;
  title?: string | null;
  poster_url?: string | null;
  rating?: number | null;
  year?: string | null;
};

type RankedItem = {
  label: string;
  value: number;
  mediaType?: 'movie' | 'tv';
  mediaId?: number;
};

type DailyTraffic = {
  date: string;
  pageViews: number;
  visitors: number;
  watchClicks: number;
};

type DashboardPayload = {
  ok: boolean;
  metrics: Metrics;
  tasks: Task[];
  missingSamples: MissingSample[];
  analytics?: {
    enabled: boolean;
    dailyTraffic: DailyTraffic[];
    topContent: RankedItem[];
    topSearches: RankedItem[];
  };
  health?: {
    supabaseConfigured: boolean;
    tmdbConfigured: boolean;
    analyticsTableReady: boolean;
    generatedAt: string;
  };
  error?: string;
};

const metricLabels: Array<{ key: keyof Metrics; label: string; hint: string; accent?: string }> = [
  { key: 'visitorsToday', label: 'ผู้เข้าชมวันนี้', hint: 'unique visitors', accent: 'text-[#f4c46b]' },
  { key: 'pageViewsToday', label: 'เปิดหน้าวันนี้', hint: 'page views', accent: 'text-sky-200' },
  { key: 'watchClicks7d', label: 'กดรับชม 7 วัน', hint: 'watch intent', accent: 'text-red-100' },
  { key: 'searches7d', label: 'ค้นหา 7 วัน', hint: 'search demand', accent: 'text-emerald-100' },
  { key: 'totalCatalog', label: 'Catalog ทั้งหมด', hint: 'ข้อมูลจาก TMDB catalog' },
  { key: 'readyLinks', label: 'พร้อมดู', hint: 'มี watch_url แล้ว' },
  { key: 'missingLinks', label: 'ยังไม่มีลิงก์', hint: 'ควรเติมก่อน' },
  { key: 'reports7d', label: 'รายงาน 7 วัน', hint: 'ลิงก์เสีย/ปัญหาใหม่' },
];

const adminModules = [
  { label: 'Catalog Manager', href: '#catalog-manager', description: 'เติมลิงก์ ดูสถานะ และแก้ข้อมูลหนัง' },
  { label: 'Analytics', href: '#analytics', description: 'ดูคนเข้าเว็บ คำค้น และคอนเทนต์ยอดนิยม' },
  { label: 'Missing Link Queue', href: '#catalog-manager', description: 'คิวหนังที่ควรเติมลิงก์ก่อน' },
  { label: 'Broken Link Reports', href: '#maintenance', description: 'รายงานลิงก์เสียและงานซ่อมด่วน' },
  { label: 'Update History', href: '#update-history', description: 'ดูประวัติการเพิ่ม แก้ไข Import, Sync, Role และ Membership' },
  { label: 'Users & Roles', href: '/admin/users', description: 'จัดการผู้ใช้และ role viewer/admin' },
  { label: 'Premium Memberships', href: '/admin/memberships', description: 'อนุมัติ Premium และตั้งวันหมดอายุ' },
  { label: 'Import / Export', href: '#catalog-manager', description: 'นำเข้า/ส่งออก CSV สำหรับลิงก์หนัง' },
  { label: 'System Health', href: '#health', description: 'ตรวจ env, Supabase, TMDB และ analytics' },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat('th-TH').format(value || 0);
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function toneClass(tone: string) {
  if (tone === 'red') return 'border-[#e50914]/35 bg-[#190305] text-red-100';
  if (tone === 'orange') return 'border-orange-400/25 bg-orange-500/10 text-orange-100';
  if (tone === 'blue') return 'border-sky-400/25 bg-sky-500/10 text-sky-100';
  if (tone === 'purple') return 'border-purple-400/25 bg-purple-500/10 text-purple-100';
  return 'border-white/10 bg-white/[0.045] text-white';
}

function shortDate(date: string) {
  return date.slice(5).replace('-', '/');
}

function maxTrafficValue(rows: DailyTraffic[]) {
  return Math.max(1, ...rows.map((row) => Math.max(row.pageViews, row.visitors, row.watchClicks)));
}

function EmptyState({ children }: { children: string }) {
  return <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 text-sm font-semibold text-white/42">{children}</div>;
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const readyPercent = useMemo(() => {
    if (!data?.metrics) return 0;
    return percent(data.metrics.readyLinks, data.metrics.totalCatalog);
  }, [data]);

  const analyticsReady = Boolean(data?.health?.analyticsTableReady || data?.metrics.totalEvents7d);
  const trafficMax = maxTrafficValue(data?.analytics?.dailyTraffic || []);

  async function loadDashboard() {
    setLoading(true);
    setError('');

    try {
      const session = getStoredSession();
      const token = session?.access_token;
      if (!token) throw new Error('ต้องเข้าสู่ระบบด้วยบัญชีแอดมินก่อน');

      const response = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = (await response.json()) as DashboardPayload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลดแดชบอร์ดไม่ได้');
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดแดชบอร์ดไม่ได้');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 text-white md:px-8">
      <div className="rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(229,9,20,0.20),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.62)] md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.30em] text-[#e50914]">Admin Command Center</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.08em] md:text-7xl">ดูดีดี Dashboard</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/52 md:text-base">
              ศูนย์ควบคุมหลังบ้านสำหรับวัดคนดู ดูแลคลังหนัง เติมลิงก์ ตรวจปัญหา และติดตามสุขภาพระบบ
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a href="/" className="rounded-2xl bg-white/[0.08] px-4 py-3 text-xs font-black text-white/75 hover:bg-white/[0.14]">หน้าเว็บ</a>
            <a href="#analytics" className="rounded-2xl bg-white/[0.08] px-4 py-3 text-xs font-black text-white/75 hover:bg-white/[0.14]">Analytics</a>
            <a href="#update-history" className="rounded-2xl bg-white/[0.08] px-4 py-3 text-xs font-black text-white/75 hover:bg-white/[0.14]">History</a>
            <a href="#catalog-manager" className="rounded-2xl bg-white/[0.08] px-4 py-3 text-xs font-black text-white/75 hover:bg-white/[0.14]">Catalog</a>
            <a href="/admin/users" className="rounded-2xl bg-white/[0.08] px-4 py-3 text-xs font-black text-white/75 hover:bg-white/[0.14]">Users</a>
            <button onClick={loadDashboard} className="rounded-2xl bg-[#e50914] px-4 py-3 text-xs font-black text-white shadow-glow">Refresh</button>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 rounded-[28px] bg-black/35 p-6 text-sm font-black text-white/50">กำลังโหลดข้อมูลแดชบอร์ด...</div>
        ) : error ? (
          <div className="mt-8 rounded-[28px] border border-[#e50914]/30 bg-[#170203]/70 p-6 text-sm font-black text-red-100">{error}</div>
        ) : data ? (
          <>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {metricLabels.map((item) => (
                <article key={item.key} className="rounded-[28px] border border-white/10 bg-black/35 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/36">{item.label}</p>
                  <p className={`mt-3 text-4xl font-black tracking-[-0.08em] ${item.accent || ''}`}>{formatNumber(data.metrics[item.key])}</p>
                  <p className="mt-2 text-xs font-semibold text-white/40">{item.hint}</p>
                </article>
              ))}
            </div>

            <div id="analytics" className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <article className="rounded-[30px] border border-white/10 bg-black/35 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/36">Visitor Analytics</p>
                    <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">คนเข้าเว็บ 7 วันล่าสุด</h2>
                    <p className="mt-1 text-xs font-semibold text-white/38">
                      {analyticsReady ? `${formatNumber(data.metrics.totalEvents7d)} events` : 'รอ migration analytics_events และ event แรก'}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-[10px] font-black ${analyticsReady ? 'bg-emerald-400/12 text-emerald-100' : 'bg-orange-400/12 text-orange-100'}`}>
                    {analyticsReady ? 'TRACKING' : 'SETUP NEEDED'}
                  </span>
                </div>

                {data.analytics?.dailyTraffic?.length ? (
                  <div className="mt-5 grid gap-2">
                    {data.analytics.dailyTraffic.map((row) => (
                      <div key={row.date} className="grid grid-cols-[44px_1fr_52px] items-center gap-3 text-xs font-bold text-white/58">
                        <span>{shortDate(row.date)}</span>
                        <div className="grid gap-1">
                          <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-[#e50914]" style={{ width: `${Math.max(4, (row.pageViews / trafficMax) * 100)}%` }} /></div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-[#f4c46b]" style={{ width: `${Math.max(4, (row.visitors / trafficMax) * 100)}%` }} /></div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-sky-300" style={{ width: `${Math.max(4, (row.watchClicks / trafficMax) * 100)}%` }} /></div>
                        </div>
                        <span className="text-right">{formatNumber(row.pageViews)}</span>
                      </div>
                    ))}
                    <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-black text-white/42">
                      <span className="text-[#e50914]">Page views</span>
                      <span className="text-[#f4c46b]">Visitors</span>
                      <span className="text-sky-300">Watch clicks</span>
                    </div>
                  </div>
                ) : <EmptyState>ยังไม่มีข้อมูล analytics ในช่วง 7 วันล่าสุด</EmptyState>}
              </article>

              <article className="rounded-[30px] border border-white/10 bg-black/35 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/36">Search Demand</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">คำค้นยอดนิยม</h2>
                <div className="mt-4 grid gap-2">
                  {data.analytics?.topSearches?.length ? data.analytics.topSearches.map((item, index) => (
                    <div key={`${item.label}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.055] px-4 py-3">
                      <p className="min-w-0 truncate text-sm font-black text-white/76">{item.label}</p>
                      <p className="text-lg font-black text-[#f4c46b]">{formatNumber(item.value)}</p>
                    </div>
                  )) : <EmptyState>ยังไม่มีคำค้นที่ถูกบันทึก</EmptyState>}
                </div>
              </article>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <article className="rounded-[30px] border border-white/10 bg-black/35 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/36">Top Content</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">หนัง/ซีรีส์ที่คนสนใจ</h2>
                <div className="mt-4 grid gap-2">
                  {data.analytics?.topContent?.length ? data.analytics.topContent.map((item) => (
                    <a key={`${item.mediaType}-${item.mediaId}`} href={item.mediaType && item.mediaId ? `/${item.mediaType}/${item.mediaId}` : '#'} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.055] px-4 py-3 transition hover:bg-white/[0.09]">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white/80">{item.label}</p>
                        <p className="mt-0.5 text-[10px] font-bold uppercase text-white/32">{item.mediaType || 'content'} {item.mediaId || ''}</p>
                      </div>
                      <p className="text-lg font-black text-[#e50914]">{formatNumber(item.value)}</p>
                    </a>
                  )) : <EmptyState>ยังไม่มีข้อมูลคอนเทนต์ยอดนิยม</EmptyState>}
                </div>
              </article>

              <article id="maintenance" className="rounded-[30px] border border-white/10 bg-black/35 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/36">Priority Tasks</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">งานด่วนเพื่อดูแลเว็บ</h2>
                <div className="mt-4 grid gap-3">
                  {data.tasks.map((task) => (
                    <div key={task.title} className={`rounded-2xl border p-4 ${toneClass(task.tone)}`}>
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-black">{task.title}</p>
                        <p className="text-2xl font-black tracking-[-0.06em]">{formatNumber(task.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <article className="rounded-[30px] border border-white/10 bg-black/35 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/36">Admin Modules</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">เมนูดูแลระบบ</h2>
                <div className="mt-4 grid gap-2">
                  {adminModules.map((item) => (
                    <a key={item.label} href={item.href} className="rounded-2xl bg-white/[0.055] px-4 py-3 text-sm font-black text-white/70 transition hover:bg-[#170203] hover:text-white">
                      <span className="block">{item.label}</span>
                      <span className="mt-1 block text-[11px] font-semibold text-white/36">{item.description}</span>
                    </a>
                  ))}
                </div>
              </article>

              <article className="rounded-[30px] border border-white/10 bg-black/35 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/36">High Rating Queue</p>
                    <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">หนังคะแนนสูงที่ควรเติมลิงก์ก่อน</h2>
                  </div>
                  <a href="#catalog-manager" className="text-xs font-black text-[#e50914] hover:text-red-300">ไปจัดการ</a>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {data.missingSamples.map((item) => (
                    <div key={`${item.media_type}-${item.tmdb_id}`} className="min-w-0">
                      <div className="aspect-[2/3] overflow-hidden rounded-2xl bg-white/[0.08]">
                        {item.poster_url ? (
                          <img src={item.poster_url} alt={item.title || String(item.tmdb_id)} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <p className="mt-2 line-clamp-2 text-[11px] font-black leading-4">{item.title || `TMDB ${item.tmdb_id}`}</p>
                      <p className="mt-1 text-[10px] font-bold text-white/36">★ {Number(item.rating || 0).toFixed(1)} • {item.year || '-'}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <article id="health" className="mt-5 rounded-[30px] border border-white/10 bg-black/35 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/36">System Health</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">สุขภาพระบบ</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  ['Supabase', data.health?.supabaseConfigured, 'URL + service role'],
                  ['TMDB', data.health?.tmdbConfigured, 'TMDB_ACCESS_TOKEN'],
                  ['Analytics Table', analyticsReady, 'analytics_events'],
                ].map(([label, ok, hint]) => (
                  <div key={String(label)} className="rounded-2xl bg-white/[0.055] p-4">
                    <p className={`text-sm font-black ${ok ? 'text-emerald-100' : 'text-orange-100'}`}>{ok ? 'พร้อมใช้งาน' : 'ต้องตั้งค่า'}</p>
                    <p className="mt-1 text-lg font-black text-white/82">{label}</p>
                    <p className="mt-1 text-xs font-semibold text-white/36">{hint}</p>
                  </div>
                ))}
              </div>
            </article>
          </>
        ) : null}
      </div>
    </section>
  );
}
