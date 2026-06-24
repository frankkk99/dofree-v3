'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

type MediaType = 'movie' | 'tv';
type MovieStatus = 'draft' | 'review' | 'published' | 'broken' | 'hidden';

type AdminMovieLink = {
  id: string;
  tmdb_id: number;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  is_active: boolean;
  notes?: string | null;
  section_slug: string;
  status: MovieStatus;
  created_at?: string;
  updated_at?: string;
};

type LinkReport = {
  id: string;
  tmdb_id?: number | null;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  url?: string | null;
  reason: string;
  detail?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type AdminPayload = {
  ok: boolean;
  links?: AdminMovieLink[];
  reports?: LinkReport[];
  error?: string;
};

const fallbackQueue = [
  { title: 'The Silent Code', meta: 'Movie • พร้อมเผยแพร่', tag: 'พร้อมดู', score: '8.6' },
  { title: 'Bangkok Midnight', meta: 'Series • รอใส่ลิงก์', tag: 'ไทย', score: '7.9' },
  { title: 'The Last Signal', meta: 'Movie • รอตรวจข้อมูล', tag: 'ใหม่', score: '8.1' },
  { title: 'Red Ocean', meta: 'Movie • ลิงก์เสีย', tag: 'Report', score: '6.8' },
];

const modules = [
  'Quick Add จาก TMDB ID',
  'จัดหมวดหมู่หน้าแรก',
  'ตั้งค่า Watch Ready',
  'ตรวจลิงก์เสีย',
  'SEO Title / Description',
  'Supabase Auth',
];

function StatusPill({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black ${active ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/60'}`}>
      {children}
    </span>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-xs font-black text-white/46">{children}</span>;
}

function inputClass() {
  return 'mt-2 h-12 w-full rounded-2xl border border-white/[0.08] bg-black/38 px-4 text-sm font-bold text-white outline-none placeholder:text-white/26 focus:border-[#e50914]/70';
}

function formatDate(value?: string) {
  if (!value) return 'ยังไม่ระบุ';
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function AdminCmsDashboard() {
  const [adminToken, setAdminToken] = useState('');
  const [links, setLinks] = useState<AdminMovieLink[]>([]);
  const [reports, setReports] = useState<LinkReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    tmdb_id: '',
    media_type: 'movie' as MediaType,
    title: '',
    title_th: '',
    watch_url: '',
    trailer_url: '',
    section_slug: 'watch-ready',
    status: 'published' as MovieStatus,
    provider: 'google-drive',
    notes: '',
  });

  useEffect(() => {
    const savedToken = window.localStorage.getItem('dofree_admin_token') || '';
    if (savedToken) {
      setAdminToken(savedToken);
      void loadDashboard(savedToken);
    }
  }, []);

  async function loadDashboard(token = adminToken) {
    if (!token.trim()) {
      setError('ใส่ Admin Token ก่อนโหลดข้อมูลจริง');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/movie-links', {
        headers: { 'x-admin-token': token.trim() },
        cache: 'no-store',
      });
      const payload = (await response.json()) as AdminPayload;

      if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลดข้อมูลไม่สำเร็จ');
      setLinks(payload.links || []);
      setReports(payload.reports || []);
      setMessage('โหลดข้อมูลจาก Supabase แล้ว');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  async function saveToken() {
    window.localStorage.setItem('dofree_admin_token', adminToken.trim());
    await loadDashboard(adminToken.trim());
  }

  async function saveMovie(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminToken.trim()) {
      setError('ใส่ Admin Token ก่อนบันทึก');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/movie-links', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-token': adminToken.trim(),
        },
        body: JSON.stringify({ ...form, tmdb_id: Number(form.tmdb_id) }),
      });
      const payload = (await response.json()) as AdminPayload & { link?: AdminMovieLink };

      if (!response.ok || !payload.ok) throw new Error(payload.error || 'บันทึกไม่สำเร็จ');
      setMessage(`บันทึก ${payload.link?.title_th || payload.link?.title || `TMDB ${form.tmdb_id}`} แล้ว`);
      setForm((current) => ({ ...current, tmdb_id: '', title: '', title_th: '', watch_url: '', trailer_url: '', notes: '' }));
      await loadDashboard(adminToken.trim());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    const ready = links.filter((item) => item.is_active && item.status === 'published' && item.watch_url).length;
    const review = links.filter((item) => item.status === 'review' || item.status === 'draft').length;
    const broken = links.filter((item) => item.status === 'broken').length + reports.filter((report) => report.status === 'pending').length;

    return [
      { label: 'คอนเทนต์ทั้งหมด', value: links.length ? String(links.length) : '1,240', helper: links.length ? 'ดึงจาก admin_movie_links' : '+128 จาก TMDB Feed', tone: 'from-[#e50914] to-[#7a050b]' },
      { label: 'พร้อมรับชม', value: links.length ? String(ready) : '86', helper: 'มีลิงก์ watch_url แล้ว', tone: 'from-[#f4c46b] to-[#8b5d12]' },
      { label: 'รอตรวจสอบ', value: links.length ? String(review) : '312', helper: 'Draft / Review', tone: 'from-white/18 to-white/5' },
      { label: 'ลิงก์มีปัญหา', value: links.length || reports.length ? String(broken) : '14', helper: 'จาก Report + Broken', tone: 'from-[#ef4444] to-[#4c0508]' },
    ];
  }, [links, reports]);

  const queueItems = links.length
    ? links.slice(0, 8).map((item) => ({
        title: item.title_th || item.title || `TMDB ${item.tmdb_id}`,
        meta: `${item.media_type === 'tv' ? 'Series' : 'Movie'} • ${item.status} • ${formatDate(item.updated_at)}`,
        tag: item.is_active && item.watch_url ? 'พร้อมดู' : item.status,
        score: String(item.tmdb_id),
      }))
    : fallbackQueue;

  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <section className="relative overflow-hidden border-b border-white/[0.08] px-4 py-8 md:px-8 md:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(229,9,20,0.24),transparent_30rem),radial-gradient(circle_at_82%_10%,rgba(244,196,107,0.12),transparent_24rem),linear-gradient(180deg,#050000,#030303)]" />
        <div className="relative z-10 mx-auto max-w-[1600px]">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <a href="/" className="text-xs font-black text-red-200/70 hover:text-red-100">← กลับหน้าแรก</a>
              <p className="mt-7 text-[10px] font-black uppercase tracking-[0.34em] text-[#e50914] md:text-xs">DOFree Admin CMS</p>
              <h1 className="mt-3 max-w-4xl text-[42px] font-black leading-[0.9] tracking-[-0.08em] md:text-[76px]">จัดการคอนเทนต์ หนัง ลิงก์ และ SEO</h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/56 md:text-lg md:leading-8">
                แอดมินเฟสแรกเชื่อม Supabase แล้ว: เพิ่มหนังจาก TMDB ID, ใส่ลิงก์รับชม, จัดเข้าหมวด Watch Ready และดูรายงานลิงก์เสียจากผู้ชม
              </p>
            </div>
            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.045] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.72)] backdrop-blur-2xl md:w-[380px]">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/38">Admin Access</p>
              <input value={adminToken} onChange={(event) => setAdminToken(event.target.value)} type="password" placeholder="DOFREE_ADMIN_TOKEN" className={inputClass()} />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={saveToken} disabled={loading} className="h-10 rounded-xl bg-[#e50914] text-xs font-black text-white shadow-glow disabled:opacity-45">{loading ? 'กำลังโหลด' : 'เชื่อมข้อมูล'}</button>
                <button type="button" onClick={() => loadDashboard()} disabled={loading} className="h-10 rounded-xl border border-white/10 bg-white/[0.08] text-xs font-black text-white/70 disabled:opacity-45">รีเฟรช</button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill active={Boolean(links.length)}>Supabase</StatusPill>
                <StatusPill active={Boolean(adminToken)}>Token</StatusPill>
                <StatusPill>TMDB Ready</StatusPill>
              </div>
              {message ? <p className="mt-3 rounded-xl bg-green-400/10 px-3 py-2 text-xs font-bold text-green-100">{message}</p> : null}
              {error ? <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100">{error}</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 py-6 md:px-8 md:py-8">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <article key={item.label} className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.045] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.55)] md:p-5">
              <div className={`h-1.5 rounded-full bg-gradient-to-r ${item.tone}`} />
              <p className="mt-4 text-[11px] font-black text-white/42">{item.label}</p>
              <h2 className="mt-2 text-4xl font-black tracking-[-0.06em] md:text-5xl">{item.value}</h2>
              <p className="mt-2 text-xs font-semibold text-white/42 md:text-sm">{item.helper}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
          <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.045] p-4 shadow-[0_26px_90px_rgba(0,0,0,0.62)] md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">Quick Add</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.06em] md:text-4xl">เพิ่มหนังเข้าระบบ</h2>
              </div>
              <StatusPill active>Live API</StatusPill>
            </div>

            <form onSubmit={saveMovie} className="mt-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <FieldLabel>TMDB ID</FieldLabel>
                  <input required inputMode="numeric" value={form.tmdb_id} onChange={(event) => setForm({ ...form, tmdb_id: event.target.value })} placeholder="เช่น 550" className={inputClass()} />
                </label>
                <label className="block">
                  <FieldLabel>ประเภท</FieldLabel>
                  <select value={form.media_type} onChange={(event) => setForm({ ...form, media_type: event.target.value as MediaType })} className={inputClass()}>
                    <option value="movie">Movie</option>
                    <option value="tv">Series</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <FieldLabel>ชื่อไทยที่อยากโชว์</FieldLabel>
                <input value={form.title_th} onChange={(event) => setForm({ ...form, title_th: event.target.value })} placeholder="เช่น ไฟต์คลับ" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>ลิงก์รับชม / Google Drive Preview</FieldLabel>
                <input value={form.watch_url} onChange={(event) => setForm({ ...form, watch_url: event.target.value })} placeholder="https://drive.google.com/file/d/.../view" className={inputClass()} />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <FieldLabel>หมวดแนะนำ</FieldLabel>
                  <select value={form.section_slug} onChange={(event) => setForm({ ...form, section_slug: event.target.value })} className={inputClass()}>
                    <option value="watch-ready">Watch Ready</option>
                    <option value="now-playing">มาใหม่</option>
                    <option value="popular">ยอดนิยม</option>
                    <option value="thai">หนังไทย</option>
                  </select>
                </label>
                <label className="block">
                  <FieldLabel>สถานะ</FieldLabel>
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as MovieStatus })} className={inputClass()}>
                    <option value="published">Published</option>
                    <option value="review">Review</option>
                    <option value="draft">Draft</option>
                    <option value="broken">Broken</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <FieldLabel>หมายเหตุ</FieldLabel>
                <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="เช่น พากย์ไทย / ซับไทย / ไฟล์ส่วนตัว" className={inputClass()} />
              </label>
              <button type="submit" disabled={saving} className="h-12 w-full rounded-2xl bg-[#e50914] text-sm font-black text-white shadow-glow transition hover:scale-[1.01] disabled:opacity-50">{saving ? 'กำลังบันทึก...' : 'บันทึกคอนเทนต์'}</button>
            </form>
          </section>

          <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.045] p-4 shadow-[0_26px_90px_rgba(0,0,0,0.62)] md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">Content Queue</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.06em] md:text-4xl">รายการล่าสุด</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill active>ทั้งหมด</StatusPill>
                <StatusPill>พร้อมดู</StatusPill>
                <StatusPill>รอตรวจ</StatusPill>
                <StatusPill>ลิงก์เสีย</StatusPill>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07]">
              {queueItems.map((item, index) => (
                <div key={`${item.title}-${index}`} className={`grid grid-cols-[1fr_auto] gap-4 p-4 md:grid-cols-[1.2fr_0.6fr_0.35fr] md:items-center ${index > 0 ? 'border-t border-white/[0.07]' : ''}`}>
                  <div>
                    <p className="text-sm font-black text-white md:text-base">{item.title}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/36">{item.meta}</p>
                  </div>
                  <span className="hidden text-xs font-black text-[#f4c46b] md:block">ID {item.score}</span>
                  <span className={`justify-self-end rounded-full px-3 py-1 text-[10px] font-black ${item.tag === 'Report' || item.tag === 'broken' ? 'bg-red-500/18 text-red-200' : 'bg-white/[0.08] text-white/68'}`}>{item.tag}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-white/[0.07] bg-black/24 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black md:text-base">รายงานลิงก์เสียล่าสุด</h3>
                <StatusPill active={Boolean(reports.length)}>{reports.length} report</StatusPill>
              </div>
              <div className="mt-3 space-y-2">
                {(reports.length ? reports.slice(0, 4) : []).map((report) => (
                  <div key={report.id} className="rounded-xl bg-white/[0.045] p-3">
                    <p className="text-xs font-black text-white/80">{report.title_th || report.title || `TMDB ${report.tmdb_id || '-'}`}</p>
                    <p className="mt-1 text-[10px] font-bold text-white/40">{report.reason} • {formatDate(report.created_at)}</p>
                  </div>
                ))}
                {!reports.length ? <p className="text-xs font-bold text-white/38">ยังไม่มี report จากผู้ใช้ หรือยังไม่ได้เชื่อม token</p> : null}
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">Roadmap Modules</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.06em] md:text-4xl">โมดูลที่ต่อเรียบร้อยระดับแรก</h2>
            </div>
            <a href="/watch-ready" className="text-sm font-black text-white/55 hover:text-white">ดูหน้า Watch Ready ›</a>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module, index) => (
              <div key={module} className="rounded-2xl border border-white/[0.07] bg-black/28 p-4">
                <p className="text-[10px] font-black text-[#e50914]">STEP {String(index + 1).padStart(2, '0')}</p>
                <p className="mt-2 text-sm font-black text-white md:text-base">{module}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
