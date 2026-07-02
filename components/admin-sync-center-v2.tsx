'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminSessionHeaders } from '@/lib/admin-session-browser';

type SyncMediaType = 'movie' | 'tv' | 'both';
type SyncStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'preview';
type WorkMode = 'new-catalog' | 'metadata-refresh' | 'missing-metadata' | 'safe-full';

type SyncProfile = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  mediaType: SyncMediaType;
  sourceBucket: string;
};

type SyncJob = {
  id: string;
  profile_id: string;
  profile_label: string;
  status: SyncStatus;
  dry_run: boolean;
  target_count: number;
  batch_size: number;
  current_page: number;
  processed_count: number;
  inserted_count: number;
  updated_count: number;
  skipped_count: number;
  error_count: number;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
};

type SyncLog = {
  id: string;
  job_id: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  created_at: string;
};

type SyncStatusPayload = {
  ok: boolean;
  generatedAt: string;
  catalog: {
    total: number;
    movies: number;
    series: number;
    readyLinks: number;
    missingLinks: number;
    brokenLinks: number;
    rating5: number;
    rating7: number;
    rating8: number;
    missingPoster: number;
    missingBackdrop: number;
    latestSyncedAt: string | null;
  };
  dashboard: {
    users: number;
    favorites: number;
    watchHistory: number;
    memberships: number;
    premiumMembers: number;
    reports: number;
    analyticsEvents7d: number;
    pageViews7d: number;
    watchClicks7d: number;
    searches7d: number;
    topContentStatus: string;
    topSearchesStatus: string;
  };
  dataSources: Array<{ key: string; label: string; ready: boolean; value: number; error?: string }>;
  profiles: SyncProfile[];
  jobs: SyncJob[];
  logs: SyncLog[];
  error?: string;
};

type SyncFilters = {
  mediaType: SyncMediaType;
  yearFrom: string;
  yearTo: string;
  voteAverageMin: string;
  voteCountMin: string;
  language: string;
  region: string;
  genre: string;
  provider: string;
  company: string;
  collection: string;
  sortBy: string;
  maxItems: string;
  batchSize: string;
};

type SafetyOptions = {
  dryRun: boolean;
  keepMovieLinks: boolean;
  keepFavoritesHistory: boolean;
  keepAnalytics: boolean;
  archiveExistingCatalog: boolean;
  refreshMetadataOnly: boolean;
  syncMissingMetadataOnly: boolean;
  syncNewTitlesOnly: boolean;
  rebuildSections: boolean;
  clearImportedRows: boolean;
};

type PreviewPayload = {
  ok: boolean;
  preview?: {
    profileLabel: string;
    mediaTypes: string[];
    targetCount: number;
    batchSize: number;
    estimatedPages: number;
    estimatedBatches: number;
    voteAverageMin: number;
    dryRun: boolean;
    preservedData: Record<string, boolean>;
    note: string;
  };
  error?: string;
};

const defaultFilters: SyncFilters = {
  mediaType: 'both',
  yearFrom: '',
  yearTo: '',
  voteAverageMin: '5',
  voteCountMin: '20',
  language: '',
  region: 'TH',
  genre: '',
  provider: '',
  company: '',
  collection: '',
  sortBy: 'popularity.desc',
  maxItems: '1000',
  batchSize: '100',
};

const defaultSafety: SafetyOptions = {
  dryRun: true,
  keepMovieLinks: true,
  keepFavoritesHistory: true,
  keepAnalytics: true,
  archiveExistingCatalog: false,
  refreshMetadataOnly: false,
  syncMissingMetadataOnly: false,
  syncNewTitlesOnly: true,
  rebuildSections: false,
  clearImportedRows: false,
};

const modeCards: Array<{ id: WorkMode; title: string; eyebrow: string; description: string; detail: string }> = [
  {
    id: 'new-catalog',
    eyebrow: 'แนะนำเริ่มต้น',
    title: 'เพิ่มรายการใหม่',
    description: 'ดึงหนัง/ซีรีส์ใหม่เข้า catalog โดยไม่แตะข้อมูลผู้ใช้และลิงก์ดูเดิม',
    detail: 'เหมาะกับการ Sync รายวันหรือเพิ่มหมวดใหม่จาก TMDB',
  },
  {
    id: 'metadata-refresh',
    eyebrow: 'Enrich',
    title: 'เติม Metadata',
    description: 'รีเฟรชข้อมูลเรื่องที่มีอยู่แล้ว เช่น คะแนน รูป เรื่องย่อ ภาษา และหมวด',
    detail: 'ใช้เมื่อต้องการให้ข้อมูลหน้าเว็บสดขึ้น โดยไม่เน้นเพิ่มเรื่องใหม่',
  },
  {
    id: 'missing-metadata',
    eyebrow: 'Repair',
    title: 'ซ่อมข้อมูลที่ขาด',
    description: 'โฟกัสรายการที่ข้อมูลยังไม่ครบ เช่น poster, backdrop หรือ overview',
    detail: 'เหมาะกับการเก็บงานให้ catalog ดูสมบูรณ์ขึ้น',
  },
  {
    id: 'safe-full',
    eyebrow: 'ครบชุด',
    title: 'Sync + Enrich',
    description: 'ดึงรายการใหม่พร้อมรีเฟรช metadata ในรอบเดียวแบบปลอดภัย',
    detail: 'เหมาะกับการจัดระบบใหญ่หลังเพิ่มหลายหมวด',
  },
];

const statusTone: Record<string, string> = {
  running: 'bg-sky-500/15 text-sky-100 ring-1 ring-sky-400/20',
  paused: 'bg-amber-400/15 text-amber-100 ring-1 ring-amber-300/20',
  completed: 'bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/20',
  failed: 'bg-[#e50914]/18 text-red-100 ring-1 ring-[#e50914]/24',
  cancelled: 'bg-white/[0.08] text-white/60 ring-1 ring-white/10',
  preview: 'bg-white/[0.08] text-white/70 ring-1 ring-white/10',
  queued: 'bg-white/[0.08] text-white/70 ring-1 ring-white/10',
};

function cardClass(extra = '') {
  return `scroll-mt-28 rounded-[26px] border border-white/14 bg-[#121212]/96 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.055)] md:p-5 ${extra}`;
}

function inputClass() {
  return 'h-11 w-full rounded-2xl border border-white/18 bg-[#0c0c0c] px-3 text-sm font-bold text-white outline-none transition placeholder:text-white/35 focus:border-[#e50914] focus:ring-2 focus:ring-[#e50914]/20';
}

function buttonClass(tone: 'red' | 'dark' | 'gold' | 'green' = 'dark') {
  if (tone === 'red') return 'h-11 rounded-2xl bg-[#e50914] px-5 text-xs font-black text-white shadow-[0_14px_34px_rgba(229,9,20,0.28)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45';
  if (tone === 'gold') return 'h-11 rounded-2xl bg-amber-300 px-5 text-xs font-black text-black shadow-[0_14px_34px_rgba(251,191,36,0.16)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45';
  if (tone === 'green') return 'h-11 rounded-2xl bg-emerald-300 px-5 text-xs font-black text-black shadow-[0_14px_34px_rgba(16,185,129,0.16)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45';
  return 'h-11 rounded-2xl bg-white/[0.11] px-5 text-xs font-black text-white/86 ring-1 ring-white/10 transition hover:bg-white/[0.16] hover:text-white disabled:cursor-not-allowed disabled:opacity-45';
}

function checkClass(isDanger = false) {
  return `flex min-h-[46px] items-center gap-3 rounded-[18px] border px-3 py-2 text-xs font-black ${isDanger ? 'border-amber-300/24 bg-amber-300/[0.08] text-amber-50' : 'border-white/12 bg-white/[0.045] text-white/78'}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('th-TH').format(value || 0);
}

function safeDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

function normalizeFilters(filters: SyncFilters) {
  return {
    mediaType: filters.mediaType,
    yearFrom: filters.yearFrom ? Number(filters.yearFrom) : null,
    yearTo: filters.yearTo ? Number(filters.yearTo) : null,
    voteAverageMin: Number(filters.voteAverageMin || 5),
    voteCountMin: Number(filters.voteCountMin || 0),
    language: filters.language.trim(),
    region: filters.region.trim() || 'TH',
    genre: filters.genre.trim(),
    provider: filters.provider.trim(),
    company: filters.company.trim(),
    collection: filters.collection.trim(),
    sortBy: filters.sortBy.trim() || 'popularity.desc',
    maxItems: Number(filters.maxItems || 1000),
    batchSize: Number(filters.batchSize || 100),
  };
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) throw new Error('เซิร์ฟเวอร์ตอบกลับว่างเปล่า');
  return JSON.parse(text) as T;
}

function StatCard({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const toneClass = tone === 'good'
    ? 'border-emerald-400/22 bg-emerald-400/[0.06]'
    : tone === 'warn'
      ? 'border-amber-300/22 bg-amber-300/[0.06]'
      : tone === 'bad'
        ? 'border-[#e50914]/28 bg-[#e50914]/[0.07]'
        : 'border-white/12 bg-white/[0.045]';

  return (
    <article className={`min-h-[92px] rounded-[20px] border p-3.5 ${toneClass}`}>
      <p className="truncate text-[11px] font-black text-white/68">{label}</p>
      <p className="mt-2 text-[28px] font-black leading-none tracking-[-0.055em] text-white">{formatNumber(value)}</p>
    </article>
  );
}

function groupProfile(profile: SyncProfile) {
  const bucket = profile.sourceBucket.toLowerCase();
  if (['netflix', 'disney', 'hbo', 'prime', 'apple'].includes(bucket)) return 'Provider';
  if (['thai', 'korea', 'japan', 'china', 'indian', 'spanish', 'anime'].includes(bucket)) return 'ภาษา / ประเทศ';
  if (['marvel', 'dc'].includes(bucket)) return 'จักรวาล / ค่าย';
  if (['action', 'horror', 'comedy', 'romance', 'sci-fi', 'crime', 'family', 'documentary', 'animation'].includes(bucket)) return 'แนวหนัง';
  if (profile.mediaType === 'tv') return 'ซีรีส์';
  return 'พื้นฐาน';
}

export function AdminSyncCenterV2() {
  const [status, setStatus] = useState<SyncStatusPayload | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState('popular-movies');
  const [filters, setFilters] = useState<SyncFilters>(defaultFilters);
  const [safety, setSafety] = useState<SafetyOptions>(defaultSafety);
  const [workMode, setWorkMode] = useState<WorkMode>('new-catalog');
  const [preview, setPreview] = useState<PreviewPayload['preview'] | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const profiles = status?.profiles || [];
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) || profiles[0];
  const latestJob = status?.jobs?.[0];
  const selectedMode = modeCards.find((mode) => mode.id === workMode) || modeCards[0];

  const profileGroups = useMemo(() => {
    const map = new Map<string, SyncProfile[]>();
    for (const profile of profiles) {
      const group = groupProfile(profile);
      map.set(group, [...(map.get(group) || []), profile]);
    }
    const order = ['พื้นฐาน', 'Provider', 'ภาษา / ประเทศ', 'จักรวาล / ค่าย', 'แนวหนัง', 'ซีรีส์'];
    return [...map.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [profiles]);

  const catalogCards = useMemo(() => {
    const catalog = status?.catalog;
    if (!catalog) return [];
    return [
      { label: 'Catalog ทั้งหมด', value: catalog.total, tone: 'default' as const },
      { label: 'หนัง', value: catalog.movies, tone: 'default' as const },
      { label: 'ซีรีส์', value: catalog.series, tone: 'default' as const },
      { label: 'มีลิงก์ดูแล้ว', value: catalog.readyLinks, tone: 'good' as const },
      { label: 'ยังไม่มีลิงก์', value: catalog.missingLinks, tone: 'warn' as const },
      { label: 'ลิงก์เสีย', value: catalog.brokenLinks, tone: 'bad' as const },
      { label: 'ไม่มีโปสเตอร์', value: catalog.missingPoster, tone: 'warn' as const },
      { label: 'ไม่มี backdrop', value: catalog.missingBackdrop, tone: 'warn' as const },
    ];
  }, [status]);

  async function loadStatus() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/sync/status', {
        headers: adminSessionHeaders(),
        cache: 'no-store',
      });
      const payload = await readJson<SyncStatusPayload>(response);
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลด Sync Center ไม่สำเร็จ');
      setStatus(payload);
      if (!payload.profiles.some((profile) => profile.id === selectedProfileId) && payload.profiles[0]) setSelectedProfileId(payload.profiles[0].id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'โหลด Sync Center ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setFilter<K extends keyof SyncFilters>(key: K, value: SyncFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function applyMode(mode: WorkMode) {
    setWorkMode(mode);
    setPreview(null);
    if (mode === 'new-catalog') {
      setSafety({ ...defaultSafety, dryRun: true, syncNewTitlesOnly: true, refreshMetadataOnly: false, syncMissingMetadataOnly: false });
      setFilters((current) => ({ ...current, maxItems: '1000', batchSize: '100', voteAverageMin: '5', voteCountMin: '20' }));
      return;
    }
    if (mode === 'metadata-refresh') {
      setSafety({ ...defaultSafety, dryRun: true, syncNewTitlesOnly: false, refreshMetadataOnly: true, syncMissingMetadataOnly: false });
      setFilters((current) => ({ ...current, maxItems: '500', batchSize: '100', voteAverageMin: '0', voteCountMin: '0' }));
      return;
    }
    if (mode === 'missing-metadata') {
      setSafety({ ...defaultSafety, dryRun: true, syncNewTitlesOnly: false, refreshMetadataOnly: true, syncMissingMetadataOnly: true });
      setFilters((current) => ({ ...current, maxItems: '500', batchSize: '100', voteAverageMin: '0', voteCountMin: '0' }));
      return;
    }
    setSafety({ ...defaultSafety, dryRun: true, syncNewTitlesOnly: false, refreshMetadataOnly: true, syncMissingMetadataOnly: false, rebuildSections: true });
    setFilters((current) => ({ ...current, maxItems: '1000', batchSize: '100', voteAverageMin: '5', voteCountMin: '20' }));
  }

  async function postAction<T>(url: string, body: Record<string, unknown>) {
    const response = await fetch(url, {
      method: 'POST',
      headers: adminSessionHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify(body),
    });
    const payload = await readJson<T & { ok: boolean; error?: string }>(response);
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'คำสั่งไม่สำเร็จ');
    return payload;
  }

  async function previewSync() {
    setWorking(true);
    setError('');
    setNotice('');
    try {
      const payload = await postAction<PreviewPayload>('/api/admin/sync/preview', {
        profileId: selectedProfileId,
        filters: normalizeFilters(filters),
        safety,
      });
      setPreview(payload.preview || null);
      setNotice('Preview พร้อมแล้ว ยังไม่มีการเขียนข้อมูลจริง');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Preview ไม่สำเร็จ');
    } finally {
      setWorking(false);
    }
  }

  async function startSync() {
    if (!safety.dryRun) {
      const confirmed = window.confirm('ยืนยันเริ่มเขียนข้อมูลจริง? ระบบจะเก็บ watch links, favorites, history, memberships และ analytics ตามค่า Safe Guard ที่เปิดไว้');
      if (!confirmed) return;
    }

    setWorking(true);
    setError('');
    setNotice('');
    try {
      await postAction('/api/admin/sync/start', {
        profileId: selectedProfileId,
        filters: normalizeFilters(filters),
        safety,
      });
      setNotice(safety.dryRun ? 'Dry run เสร็จแล้ว ยังไม่เขียน catalog จริง' : 'งานเสร็จ 1 batch แล้ว ถ้ายังไม่ครบให้กด Resume');
      await loadStatus();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Start Sync ไม่สำเร็จ');
    } finally {
      setWorking(false);
    }
  }

  async function resumeJob(jobId: string) {
    setWorking(true);
    setError('');
    setNotice('');
    try {
      await postAction('/api/admin/sync/resume', { jobId });
      setNotice('Resume batch เสร็จแล้ว');
      await loadStatus();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Resume ไม่สำเร็จ');
    } finally {
      setWorking(false);
    }
  }

  async function cancelJob(jobId: string) {
    if (!window.confirm('ยืนยันยกเลิก Job นี้?')) return;
    setWorking(true);
    setError('');
    setNotice('');
    try {
      await postAction('/api/admin/sync/cancel', { jobId });
      setNotice('ยกเลิก Job แล้ว');
      await loadStatus();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Cancel ไม่สำเร็จ');
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-5 text-white md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-[30px] border border-white/12 bg-[#151515] p-5 shadow-[0_26px_90px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ff3b45]">All-in-one Sync Center</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.055em] text-white md:text-5xl">จัดการ TMDB Catalog ในหน้าเดียว</h1>
              <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-white/72 md:text-base">
                เลือกงานที่ต้องการทำ เลือกชุดข้อมูล Preview ก่อน แล้วค่อยเริ่ม Dry run หรือ Sync จริง โดยค่าเริ่มต้นจะไม่ลบข้อมูลผู้ใช้ ลิงก์ดู รายการโปรด ประวัติ และสถิติเดิม
              </p>
            </div>
            <div className="flex gap-2">
              <a href="/admin" className={buttonClass('dark')}>กลับแอดมิน</a>
              <button type="button" onClick={() => void loadStatus()} disabled={loading || working} className={buttonClass('dark')}>รีเฟรช</button>
            </div>
          </div>
        </section>

        {loading ? <div className={cardClass('text-sm font-black text-white/70')}>กำลังโหลด Sync Center...</div> : null}
        {error ? <div className="rounded-[22px] border border-[#e50914]/35 bg-[#2a0508] p-4 text-sm font-black leading-6 text-red-100">{error}</div> : null}
        {notice ? <div className="rounded-[22px] border border-emerald-400/25 bg-emerald-500/12 p-4 text-sm font-black leading-6 text-emerald-100">{notice}</div> : null}

        {status ? (
          <>
            <section className={cardClass()}>
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#ff3b45]">Step 1</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">เลือกงานที่ต้องการทำ</h2>
                  <p className="mt-1 text-xs font-semibold text-white/58">ไม่ต้องจำ checkbox เอง เลือกโหมดแล้วระบบตั้งค่า Safe Guard ให้</p>
                </div>
                <span className="rounded-full bg-white/[0.09] px-3 py-1.5 text-[10px] font-black text-white/66 ring-1 ring-white/10">โหมดปัจจุบัน: {selectedMode.title}</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {modeCards.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => applyMode(mode.id)}
                    className={`min-h-[160px] rounded-[24px] border p-4 text-left transition ${workMode === mode.id ? 'border-[#e50914] bg-[#e50914]/16 shadow-[0_18px_50px_rgba(229,9,20,0.16)]' : 'border-white/12 bg-white/[0.045] hover:bg-white/[0.08]'}`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff6b72]">{mode.eyebrow}</span>
                    <span className="mt-2 block text-xl font-black tracking-[-0.04em] text-white">{mode.title}</span>
                    <span className="mt-2 block text-xs font-bold leading-5 text-white/62">{mode.description}</span>
                    <span className="mt-3 block rounded-2xl bg-black/24 px-3 py-2 text-[11px] font-bold leading-5 text-white/48">{mode.detail}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className={cardClass()}>
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#ff3b45]">Step 2</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">เลือกหมวด / Profile ที่จะ Sync</h2>
                  <p className="mt-1 text-xs font-semibold text-white/58">จัดกลุ่มให้ตรงกับหมวดหน้าเว็บ เช่น Provider, ภาษา, จักรวาลหนัง และแนวหนัง</p>
                </div>
                {selectedProfile ? <span className="rounded-full bg-[#e50914] px-3 py-1.5 text-[10px] font-black text-white">{selectedProfile.label}</span> : null}
              </div>
              <div className="mt-4 space-y-5">
                {profileGroups.map(([group, items]) => (
                  <div key={group}>
                    <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/46">{group}</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                      {items.map((profile) => (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() => setSelectedProfileId(profile.id)}
                          className={`min-h-[78px] rounded-[18px] border p-3 text-left transition ${selectedProfileId === profile.id ? 'border-[#e50914] bg-[#e50914]/16 text-white shadow-[0_12px_34px_rgba(229,9,20,0.14)]' : 'border-white/12 bg-white/[0.045] text-white/76 hover:bg-white/[0.08] hover:text-white'}`}
                        >
                          <span className="block text-sm font-black">{profile.shortLabel}</span>
                          <span className="mt-1 line-clamp-2 block text-[10px] font-semibold leading-4 text-white/56">{profile.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={cardClass()}>
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#ff3b45]">Step 3</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">ตั้งค่าจำนวนและความปลอดภัย</h2>
                  <p className="mt-1 text-xs font-semibold text-white/58">ค่าเริ่มต้นเหมาะกับการทดลองก่อน ถ้าต้องเขียนจริงให้ปิด Dry run</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void previewSync()} disabled={working} className={buttonClass('dark')}>Preview</button>
                  <button type="button" onClick={() => void startSync()} disabled={working} className={buttonClass(safety.dryRun ? 'gold' : 'red')}>{safety.dryRun ? 'เริ่ม Dry Run' : 'เริ่ม Sync จริง'}</button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
                <div className="rounded-[24px] border border-white/12 bg-white/[0.045] p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/46">ตัวกรองหลัก</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <label className="space-y-2"><span className="text-xs font-black text-white/68">ประเภท</span><select value={filters.mediaType} onChange={(event) => setFilter('mediaType', event.target.value as SyncMediaType)} className={inputClass()}><option value="both">movie + tv</option><option value="movie">movie</option><option value="tv">tv</option></select></label>
                    <label className="space-y-2"><span className="text-xs font-black text-white/68">คะแนนขั้นต่ำ</span><input value={filters.voteAverageMin} onChange={(event) => setFilter('voteAverageMin', event.target.value)} inputMode="decimal" className={inputClass()} /></label>
                    <label className="space-y-2"><span className="text-xs font-black text-white/68">โหวตขั้นต่ำ</span><input value={filters.voteCountMin} onChange={(event) => setFilter('voteCountMin', event.target.value)} inputMode="numeric" className={inputClass()} /></label>
                    <label className="space-y-2"><span className="text-xs font-black text-white/68">ภูมิภาค</span><input value={filters.region} onChange={(event) => setFilter('region', event.target.value)} className={inputClass()} /></label>
                    <label className="space-y-2"><span className="text-xs font-black text-white/68">จำนวนสูงสุด</span><input value={filters.maxItems} onChange={(event) => setFilter('maxItems', event.target.value)} inputMode="numeric" className={inputClass()} /></label>
                    <label className="space-y-2"><span className="text-xs font-black text-white/68">ต่อรอบ</span><input value={filters.batchSize} onChange={(event) => setFilter('batchSize', event.target.value)} inputMode="numeric" className={inputClass()} /></label>
                    <label className="space-y-2"><span className="text-xs font-black text-white/68">ปีเริ่ม</span><input value={filters.yearFrom} onChange={(event) => setFilter('yearFrom', event.target.value)} inputMode="numeric" placeholder="ว่างได้" className={inputClass()} /></label>
                    <label className="space-y-2"><span className="text-xs font-black text-white/68">ปีสิ้นสุด</span><input value={filters.yearTo} onChange={(event) => setFilter('yearTo', event.target.value)} inputMode="numeric" placeholder="ว่างได้" className={inputClass()} /></label>
                    <label className="space-y-2 md:col-span-4"><span className="text-xs font-black text-white/68">เรียงข้อมูล</span><select value={filters.sortBy} onChange={(event) => setFilter('sortBy', event.target.value)} className={inputClass()}><option value="popularity.desc">popularity.desc</option><option value="vote_average.desc">vote_average.desc</option><option value="primary_release_date.desc">primary_release_date.desc</option><option value="first_air_date.desc">first_air_date.desc</option></select></label>
                  </div>
                </div>

                <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-400/[0.045] p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-100/80">Safe Guard</p>
                  <div className="mt-4 grid gap-2">
                    <label className={checkClass()}><input type="checkbox" checked={safety.dryRun} onChange={(event) => setSafety((current) => ({ ...current, dryRun: event.target.checked }))} className="h-4 w-4 accent-[#e50914]" /><span>Dry run ก่อน ไม่เขียนจริง</span></label>
                    <label className={checkClass()}><input type="checkbox" checked={safety.keepMovieLinks} onChange={(event) => setSafety((current) => ({ ...current, keepMovieLinks: event.target.checked }))} className="h-4 w-4 accent-[#e50914]" /><span>เก็บลิงก์ดูเดิม</span></label>
                    <label className={checkClass()}><input type="checkbox" checked={safety.keepFavoritesHistory} onChange={(event) => setSafety((current) => ({ ...current, keepFavoritesHistory: event.target.checked }))} className="h-4 w-4 accent-[#e50914]" /><span>เก็บรายการโปรด/ประวัติดู</span></label>
                    <label className={checkClass()}><input type="checkbox" checked={safety.keepAnalytics} onChange={(event) => setSafety((current) => ({ ...current, keepAnalytics: event.target.checked }))} className="h-4 w-4 accent-[#e50914]" /><span>เก็บสถิติเดิม</span></label>
                  </div>
                </div>
              </div>

              <button type="button" onClick={() => setAdvancedOpen((value) => !value)} className="mt-4 rounded-full bg-white/[0.08] px-4 py-2 text-xs font-black text-white/68 ring-1 ring-white/10 hover:bg-white/[0.12]">
                {advancedOpen ? 'ซ่อนค่าขั้นสูง' : 'เปิดค่าขั้นสูง'}
              </button>

              {advancedOpen ? (
                <div className="mt-4 rounded-[24px] border border-amber-300/24 bg-amber-300/[0.055] p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/85">Advanced</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <label className="space-y-2"><span className="text-xs font-black text-white/68">Language</span><input value={filters.language} onChange={(event) => setFilter('language', event.target.value)} placeholder="th, ko, ja" className={inputClass()} /></label>
                    <label className="space-y-2"><span className="text-xs font-black text-white/68">Genre ID</span><input value={filters.genre} onChange={(event) => setFilter('genre', event.target.value)} placeholder="28, 35" className={inputClass()} /></label>
                    <label className="space-y-2"><span className="text-xs font-black text-white/68">Provider ID</span><input value={filters.provider} onChange={(event) => setFilter('provider', event.target.value)} placeholder="ว่าง = จาก profile" className={inputClass()} /></label>
                    <label className="space-y-2"><span className="text-xs font-black text-white/68">Company ID</span><input value={filters.company} onChange={(event) => setFilter('company', event.target.value)} placeholder="ว่าง = จาก profile" className={inputClass()} /></label>
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                    <label className={checkClass(true)}><input type="checkbox" checked={safety.syncNewTitlesOnly} onChange={(event) => setSafety((current) => ({ ...current, syncNewTitlesOnly: event.target.checked }))} className="h-4 w-4 accent-[#e50914]" /><span>เฉพาะเรื่องใหม่</span></label>
                    <label className={checkClass(true)}><input type="checkbox" checked={safety.refreshMetadataOnly} onChange={(event) => setSafety((current) => ({ ...current, refreshMetadataOnly: event.target.checked }))} className="h-4 w-4 accent-[#e50914]" /><span>รีเฟรช metadata</span></label>
                    <label className={checkClass(true)}><input type="checkbox" checked={safety.syncMissingMetadataOnly} onChange={(event) => setSafety((current) => ({ ...current, syncMissingMetadataOnly: event.target.checked }))} className="h-4 w-4 accent-[#e50914]" /><span>เฉพาะข้อมูลที่ขาด</span></label>
                    <label className={checkClass(true)}><input type="checkbox" checked={safety.rebuildSections} onChange={(event) => setSafety((current) => ({ ...current, rebuildSections: event.target.checked }))} className="h-4 w-4 accent-[#e50914]" /><span>จัด section ใหม่</span></label>
                    <label className={checkClass(true)}><input type="checkbox" checked={safety.clearImportedRows} onChange={(event) => setSafety((current) => ({ ...current, clearImportedRows: event.target.checked }))} className="h-4 w-4 accent-[#e50914]" /><span>ล้างข้อมูล import</span></label>
                  </div>
                </div>
              ) : null}

              {preview ? (
                <div className="mt-5 rounded-[22px] border border-amber-300/25 bg-amber-300/10 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-100">ผล Preview</p>
                  <div className="mt-3 grid gap-2 text-sm font-bold text-white/82 md:grid-cols-4">
                    <p>ชุดข้อมูล: {preview.profileLabel}</p>
                    <p>เป้าหมาย: {formatNumber(preview.targetCount)}</p>
                    <p>ต่อรอบ: {formatNumber(preview.batchSize)}</p>
                    <p>ประมาณ {formatNumber(preview.estimatedBatches)} batches</p>
                  </div>
                  <p className="mt-3 text-xs font-semibold leading-5 text-white/62">{preview.note}</p>
                </div>
              ) : null}
            </section>

            <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
              <div className={cardClass()}>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#ff3b45]">สถานะ Catalog</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">ข้อมูลจริงจาก Database</h2>
                <p className="mt-1 text-xs font-semibold text-white/58">อัปเดตล่าสุด: {safeDate(status.catalog.latestSyncedAt)}</p>
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                  {catalogCards.map(({ label, value, tone }) => <StatCard key={label} label={label} value={value} tone={tone} />)}
                </div>
              </div>

              <div className={cardClass()}>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#ff3b45]">Sources</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">ตารางที่ระบบใช้งาน</h2>
                <div className="mt-4 grid gap-2">
                  {status.dataSources.map((source) => (
                    <div key={source.key} className="flex items-center justify-between gap-3 rounded-[18px] border border-white/12 bg-white/[0.045] px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white/88">{source.label}</p>
                        <p className="truncate text-[10px] font-semibold text-white/50">{source.ready ? 'อ่านได้จาก database' : 'ต้องตั้งค่า / migration ยังไม่พร้อม'}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${source.ready ? 'bg-emerald-400/14 text-emerald-100' : 'bg-amber-300/15 text-amber-100'}`}>{source.ready ? formatNumber(source.value) : 'SETUP'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className={cardClass()}>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#ff3b45]">Jobs</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">งาน Sync ล่าสุด</h2>
                <div className="mt-4 space-y-3">
                  {!status.jobs.length ? <p className="rounded-[18px] bg-white/[0.055] p-4 text-sm font-bold text-white/55">ยังไม่มี Job</p> : null}
                  {status.jobs.map((job) => (
                    <article key={job.id} className="rounded-[20px] border border-white/12 bg-white/[0.045] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-white">{job.profile_label}</p>
                          <p className="mt-1 text-[11px] font-bold text-white/48">{job.dry_run ? 'Dry run' : 'เขียนจริง'} · page {job.current_page} · {safeDate(job.updated_at)}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-black ${statusTone[job.status] || statusTone.queued}`}>{job.status}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-white/62 md:grid-cols-4">
                        <span>ประมวลผล {formatNumber(job.processed_count)}</span>
                        <span>เพิ่มใหม่ {formatNumber(job.inserted_count)}</span>
                        <span>อัปเดต {formatNumber(job.updated_count)}</span>
                        <span>ข้าม {formatNumber(job.skipped_count)}</span>
                      </div>
                      {job.last_error ? <p className="mt-2 rounded-xl bg-[#e50914]/12 p-2 text-xs font-bold text-red-100">{job.last_error}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {job.status !== 'completed' && job.status !== 'cancelled' ? <button type="button" onClick={() => void resumeJob(job.id)} disabled={working} className={buttonClass('dark')}>ทำต่อ Resume</button> : null}
                        {job.status !== 'completed' && job.status !== 'cancelled' ? <button type="button" onClick={() => void cancelJob(job.id)} disabled={working} className={buttonClass('red')}>ยกเลิก</button> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className={cardClass()}>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#ff3b45]">Logs</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">บันทึกล่าสุด</h2>
                <div className="mt-4 space-y-2">
                  {!status.logs.length ? <p className="rounded-[18px] bg-white/[0.055] p-4 text-sm font-bold text-white/55">ยังไม่มี log</p> : null}
                  {status.logs.slice(0, 12).map((log) => (
                    <div key={log.id} className="rounded-[18px] border border-white/12 bg-white/[0.045] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${log.level === 'error' ? 'bg-[#e50914]/16 text-red-100' : log.level === 'success' ? 'bg-emerald-400/12 text-emerald-100' : 'bg-white/[0.08] text-white/66'}`}>{log.level}</span>
                        <span className="text-[10px] font-bold text-white/46">{safeDate(log.created_at)}</span>
                      </div>
                      <p className="mt-2 break-words text-xs font-bold leading-5 text-white/72">{log.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {latestJob ? (
              <section className={cardClass('text-xs font-semibold leading-5 text-white/62')}>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#ff3b45]">Safety Note</p>
                <p className="mt-2">Job ล่าสุด {latestJob.dry_run ? 'เป็น Dry run ไม่เขียน catalog จริง' : 'เขียนข้อมูลลง catalog จริง'} ระบบนี้ยังคงป้องกันข้อมูลผู้ใช้ ลิงก์ดู รายการโปรด ประวัติดู สมาชิก และ analytics ตาม Safe Guard ที่เปิดไว้</p>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
