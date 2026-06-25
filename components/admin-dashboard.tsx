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
  sections: number;
  categories: number;
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

type DashboardPayload = {
  ok: boolean;
  metrics: Metrics;
  tasks: Task[];
  missingSamples: MissingSample[];
  error?: string;
};

const metricLabels: Array<{ key: keyof Metrics; label: string; hint: string }> = [
  { key: 'totalCatalog', label: 'Catalog ทั้งหมด', hint: 'ข้อมูลจาก TMDB catalog' },
  { key: 'readyLinks', label: 'พร้อมดู', hint: 'มี watch_url แล้ว' },
  { key: 'missingLinks', label: 'ยังไม่มีลิงก์', hint: 'ควรเติมก่อน' },
  { key: 'brokenLinks', label: 'ลิงก์เสีย', hint: 'ต้องตรวจแก้' },
  { key: 'users', label: 'ผู้ใช้', hint: 'profiles ทั้งหมด' },
  { key: 'premiumMembers', label: 'Premium', hint: 'สมาชิก active' },
  { key: 'favorites', label: 'Favorites', hint: 'รายการโปรดทั้งหมด' },
  { key: 'watchHistory', label: 'History', hint: 'ประวัติการรับชม' },
];

const adminModules = [
  { label: 'Catalog Manager', href: '#catalog-manager', description: 'เติมลิงก์ ดูสถานะ และแก้ข้อมูลหนัง' },
  { label: 'Missing Link Queue', href: '#catalog-manager', description: 'คิวหนังที่ควรเติมลิงก์ก่อน' },
  { label: 'Broken Link Reports', href: '#catalog-manager', description: 'เตรียมต่อรายงานลิงก์เสีย' },
  { label: 'Users & Roles', href: '/admin/users', description: 'จัดการผู้ใช้และ role viewer/admin' },
  { label: 'Premium Memberships', href: '/admin/memberships', description: 'อนุมัติ Premium และตั้งวันหมดอายุ' },
  { label: 'Import / Export', href: '#catalog-manager', description: 'นำเข้า/ส่งออก CSV สำหรับลิงก์หนัง' },
  { label: 'Site Settings', href: '#catalog-manager', description: 'เตรียมต่อการตั้งค่าเว็บ' },
  { label: 'Analytics', href: '#catalog-manager', description: 'เตรียมต่อสถิติการใช้งาน' },
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

export function AdminDashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const readyPercent = useMemo(() => {
    if (!data?.metrics) return 0;
    return percent(data.metrics.readyLinks, data.metrics.totalCatalog);
  }, [data]);

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
            <h1 className="mt-3 text-4xl font-black tracking-[-0.08em] md:text-7xl">DOFree Dashboard</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/52 md:text-base">
              ศูนย์ควบคุมหลังบ้านสำหรับดูสุขภาพระบบ เติมลิงก์หนัง ตรวจลิงก์เสีย จัดการผู้ใช้ และเตรียมต่อระบบสมาชิก
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a href="/" className="rounded-2xl bg-white/[0.08] px-4 py-3 text-xs font-black text-white/75 hover:bg-white/[0.14]">หน้าเว็บ</a>
            <a href="/admin/users" className="rounded-2xl bg-white/[0.08] px-4 py-3 text-xs font-black text-white/75 hover:bg-white/[0.14]">Users</a>
            <a href="/admin/memberships" className="rounded-2xl bg-white/[0.08] px-4 py-3 text-xs font-black text-white/75 hover:bg-white/[0.14]">Memberships</a>
            <a href="/favorites" className="rounded-2xl bg-white/[0.08] px-4 py-3 text-xs font-black text-white/75 hover:bg-white/[0.14]">Favorites</a>
            <a href="/history" className="rounded-2xl bg-white/[0.08] px-4 py-3 text-xs font-black text-white/75 hover:bg-white/[0.14]">History</a>
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
                  <p className="mt-3 text-4xl font-black tracking-[-0.08em]">{formatNumber(data.metrics[item.key])}</p>
                  <p className="mt-2 text-xs font-semibold text-white/40">{item.hint}</p>
                </article>
              ))}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-[30px] border border-white/10 bg-black/35 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/36">Watch Ready Coverage</p>
                    <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">ความพร้อมของคลังหนัง</h2>
                  </div>
                  <p className="text-4xl font-black tracking-[-0.08em] text-[#e50914]">{readyPercent}%</p>
                </div>
                <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/[0.08]">
                  <div className="h-full rounded-full bg-[#e50914]" style={{ width: `${readyPercent}%` }} />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-white/[0.05] p-4">
                    <p className="text-xs font-bold text-white/40">พร้อมดู</p>
                    <p className="mt-1 text-2xl font-black">{formatNumber(data.metrics.readyLinks)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.05] p-4">
                    <p className="text-xs font-bold text-white/40">ยังไม่มีลิงก์</p>
                    <p className="mt-1 text-2xl font-black">{formatNumber(data.metrics.missingLinks)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.05] p-4">
                    <p className="text-xs font-bold text-white/40">รายงานปัญหา</p>
                    <p className="mt-1 text-2xl font-black">{formatNumber(data.metrics.reports)}</p>
                  </div>
                </div>
              </article>

              <article className="rounded-[30px] border border-white/10 bg-black/35 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/36">Priority Tasks</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">งานด่วน</h2>
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
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">เมนูที่ควรมี</h2>
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
                          // eslint-disable-next-line @next/next/no-img-element
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
          </>
        ) : null}
      </div>
    </section>
  );
}
