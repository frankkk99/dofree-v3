'use client';

import { useEffect, useState } from 'react';
import { getStoredSession } from '@/lib/supabase-auth-browser';

type RangeKey = 'today' | '7d' | '30d' | '90d';
type Day = { date: string; pageViews: number; visitors: number; sessions?: number; watchClicks: number; searches?: number; adViews?: number };
type Row = { label?: string; value?: number; code?: string; views?: number; clicks?: number; closes?: number; ctr?: number };
type Payload = { ok: boolean; range?: { days: number; generatedAt: string }; metrics: Record<string, number>; tasks: { title: string; value: number; tone: string }[]; analytics?: { dailyTraffic: Day[]; topPages: Row[]; topSearches: Row[]; topContent: Row[]; devices: Row[]; browsers: Row[]; sources: Row[]; ads: Row[] }; health?: { supabaseConfigured: boolean; tmdbConfigured: boolean; analyticsTableReady: boolean }; error?: string };

const ranges: Array<{ key: RangeKey; label: string }> = [{ key: 'today', label: 'วันนี้' }, { key: '7d', label: '7 วัน' }, { key: '30d', label: '30 วัน' }, { key: '90d', label: '90 วัน' }];
const fmt = (v: unknown) => new Intl.NumberFormat('th-TH').format(Number(v || 0));
const pct = (v: number, t: number) => (t ? Math.round((v / t) * 1000) / 10 : 0);
const width = (v: number, t: number) => `${Math.max(3, Math.min(100, pct(v, t)))}%`;
const maxDay = (rows: Day[]) => Math.max(1, ...rows.map((row) => Math.max(row.pageViews || 0, row.visitors || 0, row.sessions || 0, row.watchClicks || 0, row.searches || 0, row.adViews || 0)));
const panelClass = 'min-w-0 overflow-hidden rounded-2xl border border-white/8 bg-black/35 p-4';

function Stat({ label, value, hint, accent = '' }: { label: string; value: unknown; hint: string; accent?: string }) {
  return <article className="min-w-0 overflow-hidden rounded-2xl border border-white/8 bg-black/32 p-3"><p className="truncate text-[10px] font-black text-white/42">{label}</p><p className={`mt-2 truncate text-2xl font-black tracking-[-0.04em] ${accent}`}>{typeof value === 'string' ? value : fmt(value)}</p><p className="mt-1 truncate text-[11px] font-semibold text-white/36">{hint}</p></article>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl bg-white/[0.04] p-4 text-sm font-bold text-white/42">{text}</div>;
}

function Bar({ label, value, total, color = 'bg-[#e50914]' }: { label: string; value: number; total: number; color?: string }) {
  return <div className="min-w-0"><div className="mb-1 grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-xs font-black text-white/58"><span className="truncate">{label}</span><span>{pct(value, total)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className={`h-full rounded-full ${color}`} style={{ width: width(value, total) }} /></div></div>;
}

function List({ rows, empty, total }: { rows?: Row[]; empty: string; total?: number }) {
  return <div className="grid min-w-0 gap-2">{rows?.length ? rows.map((row, index) => {
    const rowLabel = row.label || row.code || '-';
    const rowValue = Number(row.value ?? row.views ?? 0);
    return (
      <div key={`${rowLabel}-${index}`} className="min-w-0 overflow-hidden rounded-2xl bg-white/[0.055] px-4 py-3">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <p className="min-w-0 truncate text-sm font-black text-white/78" title={rowLabel}>{rowLabel}</p>
          <p className="shrink-0 whitespace-nowrap text-lg font-black text-[#f4c46b]">{fmt(rowValue)}</p>
        </div>
        {total ? <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-[#f4c46b]" style={{ width: width(rowValue, total) }} /></div> : null}
      </div>
    );
  }) : <Empty text={empty} />}</div>;
}

export function AdminDashboardCommandV2() {
  const [range, setRange] = useState<RangeKey>('7d');
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(nextRange = range) {
    setLoading(true); setError('');
    try {
      const token = getStoredSession()?.access_token;
      if (!token) throw new Error('ต้องเข้าสู่ระบบด้วยบัญชีแอดมินก่อน');
      const response = await fetch(`/api/admin/dashboard?range=${nextRange}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const payload = await response.json() as Payload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลดแดชบอร์ดไม่ได้');
      setData(payload);
    } catch (err) { setError(err instanceof Error ? err.message : 'โหลดแดชบอร์ดไม่ได้'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(range); }, [range]);

  const m = data?.metrics || {};
  const analytics = data?.analytics;
  const days = analytics?.dailyTraffic || [];
  const maxTraffic = maxDay(days);
  const pageViews = Number(m.pageViews7d || 0);
  const detailOpens = Number(m.detailOpens7d || 0);
  const watchClicks = Number(m.watchClicks7d || 0);
  const trackingReady = Boolean(data?.health?.analyticsTableReady || m.totalEvents7d);

  return <section className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-4 text-white md:px-8 md:py-6"><div className="admin-floating-glass max-w-full overflow-hidden rounded-2xl border border-white/8 p-3 md:rounded-[28px] md:p-5">
    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e50914]">Command Center</p><h1 className="mt-1 text-2xl font-black tracking-[-0.05em] md:text-4xl">Dashboard V2</h1><p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-white/42">Traffic, Funnel, Search, Content, Ads, Audience, Health และ Priority Tasks ในหน้าเดียว</p></div><button onClick={() => load(range)} className="w-fit rounded-xl bg-[#e50914] px-4 py-2.5 text-xs font-black text-white">Refresh</button></div>
    <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1">{ranges.map((item) => <button key={item.key} onClick={() => setRange(item.key)} className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-black ${range === item.key ? 'bg-white text-black' : 'bg-white/[0.08] text-white/55'}`}>{item.label}</button>)}</div><span className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-black ${trackingReady ? 'bg-emerald-400/12 text-emerald-100' : 'bg-orange-400/12 text-orange-100'}`}>{trackingReady ? 'TRACKING ON' : 'SETUP NEEDED'}</span></div>
    {loading ? <div className="mt-8 rounded-[28px] bg-black/35 p-6 text-sm font-black text-white/50">กำลังโหลดข้อมูลแดชบอร์ด...</div> : error ? <div className="mt-8 rounded-[28px] border border-[#e50914]/30 bg-[#170203]/70 p-6 text-sm font-black text-red-100">{error}</div> : data ? <>
      <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-4"><Stat label="Active now" value={m.activeNow} hint="5 นาทีล่าสุด" accent="text-emerald-100" /><Stat label="Visitors today" value={m.visitorsToday} hint="unique visitors" accent="text-[#f4c46b]" /><Stat label="Sessions today" value={m.sessionsToday} hint="sessions" accent="text-sky-200" /><Stat label="Page views today" value={m.pageViewsToday} hint="เปิดหน้าวันนี้" accent="text-red-100" /><Stat label={`Visitors ${data.range?.days || 7} วัน`} value={m.visitors7d} hint="unique visitors" /><Stat label="Page views" value={pageViews} hint="ช่วงเวลาที่เลือก" /><Stat label="Detail opens" value={detailOpens} hint="เปิดรายละเอียด" /><Stat label="Watch clicks" value={watchClicks} hint={`CTR ${m.watchClickRate || 0}%`} accent="text-[#e50914]" /><Stat label="Searches" value={m.searches7d} hint={`Rate ${m.searchRate || 0}%`} accent="text-emerald-100" /><Stat label="Ad views" value={m.adViews7d} hint={`CTR ${m.adCtr || 0}%`} accent="text-[#f4c46b]" /><Stat label="Ad clicks" value={m.adClicks7d} hint="คลิก Ads" /><Stat label="Events" value={m.totalEvents7d} hint="event รวม" /></div>
      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[1.2fr_0.8fr]"><div className={panelClass}><h2 className="text-lg font-black">Traffic Trend</h2><div className="mt-4 grid gap-3">{days.map((day) => <div key={day.date} className="grid min-w-0 grid-cols-[46px_minmax(0,1fr)_58px] items-center gap-3 text-xs font-bold text-white/58"><span>{day.date.slice(5).replace('-', '/')}</span><div className="grid min-w-0 gap-1"><div className="h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-[#e50914]" style={{ width: width(day.pageViews || 0, maxTraffic) }} /></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-[#f4c46b]" style={{ width: width(day.visitors || 0, maxTraffic) }} /></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-sky-300" style={{ width: width(day.watchClicks || 0, maxTraffic) }} /></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-emerald-300" style={{ width: width(day.searches || 0, maxTraffic) }} /></div></div><span className="text-right">{fmt(day.pageViews)}</span></div>)}</div></div><div className={panelClass}><h2 className="text-lg font-black">Conversion Funnel</h2><div className="mt-4 grid gap-4"><Bar label="Page views" value={pageViews} total={pageViews} /><Bar label="Detail opens" value={detailOpens} total={pageViews} color="bg-sky-300" /><Bar label="Watch clicks" value={watchClicks} total={pageViews} /><Bar label="Favorites" value={Number(m.favorites || 0)} total={pageViews} color="bg-[#f4c46b]" /></div></div></div>
      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-3"><div className={panelClass}><h2 className="text-lg font-black">Top Pages</h2><List rows={analytics?.topPages} empty="ยังไม่มี page_view" /></div><div className={panelClass}><h2 className="text-lg font-black">Devices</h2><List rows={analytics?.devices} empty="ยังไม่มี device" total={pageViews} /></div><div className={panelClass}><h2 className="text-lg font-black">Sources / Browser</h2><List rows={analytics?.sources?.length ? analytics.sources : analytics?.browsers} empty="ยังไม่มี source/browser" /></div></div>
      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2"><div className={panelClass}><h2 className="text-lg font-black">Smart Search</h2><List rows={analytics?.topSearches} empty="ยังไม่มีคำค้น" /></div><div className={panelClass}><h2 className="text-lg font-black">Top Content</h2><List rows={analytics?.topContent} empty="ยังไม่มีคอนเทนต์ยอดนิยม" /></div></div>
      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><div className={panelClass}><h2 className="text-lg font-black">Ads Performance</h2><div className="mt-4 grid min-w-0 gap-2">{analytics?.ads?.length ? analytics.ads.map((ad) => <div key={ad.code} className="min-w-0 overflow-hidden rounded-2xl bg-white/[0.055] p-4"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3"><p className="truncate font-black">{ad.code}</p><p className="whitespace-nowrap font-black text-[#f4c46b]">CTR {ad.ctr}%</p></div><p className="mt-2 truncate text-xs font-bold text-white/45">views {fmt(ad.views)} · clicks {fmt(ad.clicks)} · close {fmt(ad.closes)}</p></div>) : <Empty text="ยังไม่มี ad_view/ad_click" />}</div></div><div className={panelClass}><h2 className="text-lg font-black">Data Quality</h2><div className="mt-4 grid gap-4"><Stat label="Content score" value={`${m.contentQualityScore || 0}%`} hint="ความพร้อมรวม" accent="text-emerald-100" /><Bar label="Watch links" value={Number(m.readyLinks || 0)} total={Number(m.totalCatalog || 0)} /><Bar label="Posters" value={Number(m.posterReady || 0)} total={Number(m.totalCatalog || 0)} color="bg-[#f4c46b]" /><Bar label="Backdrops" value={Number(m.backdropReady || 0)} total={Number(m.totalCatalog || 0)} color="bg-sky-300" /></div></div></div>
      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[1.1fr_0.9fr]"><div className={panelClass}><h2 className="text-lg font-black">Priority Tasks</h2><div className="mt-4 grid min-w-0 gap-2 md:grid-cols-2">{data.tasks.map((task) => <div key={task.title} className="min-w-0 overflow-hidden rounded-xl border border-white/8 bg-white/[0.05] p-3"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><p className="truncate text-sm font-black">{task.title}</p><p className="whitespace-nowrap text-xl font-black text-[#e50914]">{fmt(task.value)}</p></div></div>)}</div></div><div className={panelClass}><h2 className="text-lg font-black">System Health</h2><div className="mt-4 grid gap-3">{[['Supabase', data.health?.supabaseConfigured], ['TMDB', data.health?.tmdbConfigured], ['Analytics', trackingReady]].map(([label, ok]) => <div key={String(label)} className="rounded-2xl bg-white/[0.055] p-4"><p className={`text-sm font-black ${ok ? 'text-emerald-100' : 'text-orange-100'}`}>{ok ? 'พร้อมใช้งาน' : 'ต้องตั้งค่า'}</p><p className="mt-1 text-lg font-black text-white/82">{label}</p></div>)}</div></div></div>
    </> : null}
  </div></section>;
}
