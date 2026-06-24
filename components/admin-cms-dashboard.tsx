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

type EditorForm = {
  id: string;
  tmdb_id: string;
  media_type: MediaType;
  title: string;
  title_th: string;
  watch_url: string;
  trailer_url: string;
  section_slug: string;
  status: MovieStatus;
  provider: string;
  notes: string;
};

type AdminCard = {
  key: string;
  title: string;
  subtitle: string;
  badge: string;
  tone: 'missing' | 'broken' | 'ready' | 'draft';
  item: AdminMovieLink;
  report?: LinkReport;
};

const emptyForm: EditorForm = {
  id: '',
  tmdb_id: '',
  media_type: 'movie',
  title: '',
  title_th: '',
  watch_url: '',
  trailer_url: '',
  section_slug: 'watch-ready',
  status: 'draft',
  provider: 'google-drive',
  notes: '',
};

const fallbackMissing: AdminMovieLink[] = Array.from({ length: 12 }, (_, index) => ({
  id: `fallback-missing-${index}`,
  tmdb_id: 91000 + index,
  media_type: index % 5 === 0 ? 'tv' : 'movie',
  title: `Waiting Movie ${index + 1}`,
  title_th: `หนังรอใส่ลิงก์ ${index + 1}`,
  watch_url: null,
  trailer_url: null,
  provider: null,
  is_active: true,
  notes: 'ตัวอย่าง layout เมื่อยังไม่ได้โหลดข้อมูลจริง',
  section_slug: index % 3 === 0 ? 'thai' : 'watch-ready',
  status: index % 2 === 0 ? 'draft' : 'review',
}));

const fallbackBroken: AdminMovieLink[] = Array.from({ length: 8 }, (_, index) => ({
  id: `fallback-broken-${index}`,
  tmdb_id: 92000 + index,
  media_type: 'movie',
  title: `Broken Link ${index + 1}`,
  title_th: `หนังลิงก์เสีย ${index + 1}`,
  watch_url: 'https://drive.google.com/file/d/example/preview',
  trailer_url: null,
  provider: 'google-drive',
  is_active: true,
  notes: 'ตัวอย่างรายการที่ถูกแจ้งลิงก์เสีย',
  section_slug: 'watch-ready',
  status: 'broken',
}));

function StatusPill({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black ${active ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/60'}`}>
      {children}
    </span>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-xs font-black text-white/48">{children}</span>;
}

function inputClass() {
  return 'mt-2 h-11 w-full rounded-2xl bg-white/[0.075] px-4 text-sm font-bold text-white outline-none ring-1 ring-white/[0.06] transition placeholder:text-white/24 focus:bg-white/[0.105] focus:ring-[#e50914]/60';
}

function textAreaClass() {
  return 'mt-2 min-h-[92px] w-full resize-none rounded-2xl bg-white/[0.075] px-4 py-3 text-sm font-bold leading-6 text-white outline-none ring-1 ring-white/[0.06] transition placeholder:text-white/24 focus:bg-white/[0.105] focus:ring-[#e50914]/60';
}

function formatDate(value?: string) {
  if (!value) return 'ยังไม่ระบุ';
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function movieTitle(item: AdminMovieLink) {
  return item.title_th || item.title || `TMDB ${item.tmdb_id}`;
}

function itemToForm(item: AdminMovieLink): EditorForm {
  return {
    id: item.id?.startsWith('fallback-') ? '' : item.id,
    tmdb_id: item.tmdb_id ? String(item.tmdb_id) : '',
    media_type: item.media_type || 'movie',
    title: item.title || '',
    title_th: item.title_th || '',
    watch_url: item.watch_url || '',
    trailer_url: item.trailer_url || '',
    section_slug: item.section_slug || 'watch-ready',
    status: item.status || 'draft',
    provider: item.provider || 'google-drive',
    notes: item.notes || '',
  };
}

function formToItem(form: EditorForm): AdminMovieLink {
  return {
    id: form.id,
    tmdb_id: Number(form.tmdb_id) || 0,
    media_type: form.media_type,
    title: form.title || null,
    title_th: form.title_th || form.title || null,
    watch_url: form.watch_url || null,
    trailer_url: form.trailer_url || null,
    provider: form.provider || null,
    is_active: form.status !== 'hidden',
    notes: form.notes || null,
    section_slug: form.section_slug || 'watch-ready',
    status: form.status,
  };
}

function toMissingCard(item: AdminMovieLink): AdminCard {
  return {
    key: `missing-${item.id || item.tmdb_id}`,
    title: movieTitle(item),
    subtitle: `${item.media_type === 'tv' ? 'Series' : 'Movie'} • ID ${item.tmdb_id} • ${item.status}`,
    badge: 'ยังไม่มีลิงก์',
    tone: 'missing',
    item,
  };
}

function toBrokenCard(item: AdminMovieLink, report?: LinkReport): AdminCard {
  return {
    key: `broken-${item.id || item.tmdb_id}-${report?.id || ''}`,
    title: movieTitle(item),
    subtitle: report ? `${report.reason} • ${formatDate(report.created_at)}` : `${item.media_type === 'tv' ? 'Series' : 'Movie'} • ID ${item.tmdb_id}`,
    badge: report ? 'ถูกแจ้งเสีย' : 'Broken',
    tone: 'broken',
    item,
    report,
  };
}

function MovieCard({ card, onOpen }: { card: AdminCard; onOpen: (card: AdminCard) => void }) {
  const toneClass = card.tone === 'broken'
    ? 'from-red-500/24 via-red-500/8 to-white/[0.035]'
    : card.tone === 'missing'
      ? 'from-[#f4c46b]/22 via-[#f4c46b]/7 to-white/[0.035]'
      : 'from-[#e50914]/22 via-[#e50914]/8 to-white/[0.035]';

  return (
    <button
      type="button"
      onClick={() => onOpen(card)}
      className="group relative min-h-[172px] overflow-hidden rounded-[24px] bg-white/[0.045] p-3 text-left shadow-[0_18px_55px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.055] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/[0.075] hover:shadow-[0_28px_80px_rgba(0,0,0,0.72)]"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${toneClass}`} />
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/[0.06] blur-2xl" />
      <div className="relative z-10 flex gap-3">
        <div className="grid h-[116px] w-[78px] shrink-0 place-items-center overflow-hidden rounded-[16px] bg-[radial-gradient(circle_at_45%_20%,rgba(229,9,20,0.58),rgba(20,20,20,0.95)_68%)] shadow-[0_18px_45px_rgba(0,0,0,0.65)]">
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/48">TMDB</p>
            <p className="mt-1 text-lg font-black tracking-[-0.06em] text-white">{card.item.tmdb_id || '-'}</p>
          </div>
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black ${card.tone === 'broken' ? 'bg-red-500/18 text-red-100' : 'bg-[#f4c46b]/16 text-[#f4c46b]'}`}>{card.badge}</span>
          <h3 className="mt-3 line-clamp-2 text-[15px] font-black leading-tight tracking-[-0.04em] text-white md:text-base">{card.title}</h3>
          <p className="mt-2 line-clamp-2 text-[10px] font-bold leading-4 text-white/42">{card.subtitle}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-black/30 px-2 py-1 text-[9px] font-black text-white/58">{card.item.section_slug || 'watch-ready'}</span>
            <span className="rounded-full bg-black/30 px-2 py-1 text-[9px] font-black text-white/58">{card.item.media_type === 'tv' ? 'Series' : 'Movie'}</span>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-[0.16em] text-white/32">คลิกเพื่อแก้ไข</span>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.08] text-sm font-black text-white/60 transition group-hover:bg-[#e50914] group-hover:text-white">›</span>
      </div>
    </button>
  );
}

function MovieGridSection({ title, eyebrow, description, cards, visibleCount, onMore, onOpen }: {
  title: string;
  eyebrow: string;
  description: string;
  cards: AdminCard[];
  visibleCount: number;
  onMore: () => void;
  onOpen: (card: AdminCard) => void;
}) {
  const visibleCards = cards.slice(0, visibleCount);
  return (
    <section className="rounded-[30px] bg-white/[0.035] p-4 shadow-[0_26px_90px_rgba(0,0,0,0.52)] ring-1 ring-white/[0.055] backdrop-blur-2xl md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.06em] md:text-4xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-xs font-semibold leading-5 text-white/42 md:text-sm md:leading-6">{description}</p>
        </div>
        <StatusPill active>{cards.length} รายการ</StatusPill>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {visibleCards.map((card) => <MovieCard key={card.key} card={card} onOpen={onOpen} />)}
      </div>

      {!visibleCards.length ? (
        <div className="mt-5 rounded-[24px] bg-black/24 p-8 text-center shadow-inner">
          <p className="text-sm font-black text-white/58">ยังไม่มีรายการในหมวดนี้</p>
          <p className="mt-1 text-xs font-bold text-white/34">ลองกดรีเฟรชหรือเพิ่มรายการใหม่</p>
        </div>
      ) : null}

      {visibleCount < cards.length ? (
        <div className="mt-5 text-center">
          <button type="button" onClick={onMore} className="h-11 rounded-2xl bg-white/[0.08] px-6 text-xs font-black text-white/70 shadow-[0_14px_40px_rgba(0,0,0,0.42)] transition hover:bg-white/[0.12] hover:text-white">
            ดูเพิ่มเติมอีก {Math.min(12, cards.length - visibleCount)} รายการ
          </button>
        </div>
      ) : null}
    </section>
  );
}

function EditorModal({ form, setForm, saving, onClose, onSubmit, report }: {
  form: EditorForm;
  setForm: (form: EditorForm) => void;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  report?: LinkReport;
}) {
  const previewItem = formToItem(form);
  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/72 px-3 py-6 text-white backdrop-blur-2xl md:px-6" role="dialog" aria-modal="true">
      <form onSubmit={onSubmit} className="mx-auto max-w-[1040px] overflow-hidden rounded-[34px] bg-[#050505]/92 shadow-[0_44px_160px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.075] backdrop-blur-2xl">
        <section className="relative overflow-hidden p-4 md:p-6">
          <div className="absolute inset-0 bg-cover bg-center opacity-16" style={{ backgroundImage: 'linear-gradient(135deg, rgba(229,9,20,.55), rgba(244,196,107,.18), rgba(0,0,0,.95))' }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_14%,rgba(229,9,20,0.32),transparent_24rem),linear-gradient(180deg,rgba(0,0,0,0.18),#050505)]" />
          <button type="button" onClick={onClose} className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/42 text-2xl font-black text-white/70 shadow-[0_14px_50px_rgba(0,0,0,0.72)] backdrop-blur-xl hover:bg-white/10 hover:text-white">×</button>

          <div className="relative z-10 flex flex-col gap-5 md:flex-row">
            <div className="grid h-[190px] w-[128px] shrink-0 place-items-center overflow-hidden rounded-[22px] bg-[radial-gradient(circle_at_45%_20%,rgba(229,9,20,0.7),rgba(18,18,18,0.95)_68%)] shadow-[0_28px_80px_rgba(0,0,0,0.72)]">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/42">TMDB</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.08em] text-white">{previewItem.tmdb_id || '-'}</p>
                <p className="mt-2 text-[10px] font-black uppercase text-[#e50914]">{previewItem.media_type}</p>
              </div>
            </div>
            <div className="min-w-0 flex-1 pt-1 md:pr-14">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">Admin Movie Editor</p>
              <h2 className="mt-2 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-6xl">{previewItem.title_th || previewItem.title || 'เพิ่ม / แก้ไขหนัง'}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill active>{previewItem.status}</StatusPill>
                <StatusPill>{previewItem.media_type === 'tv' ? 'Series' : 'Movie'}</StatusPill>
                <StatusPill>{previewItem.section_slug}</StatusPill>
              </div>
              <p className="mt-4 line-clamp-3 max-w-2xl text-sm font-semibold leading-6 text-white/52">{previewItem.notes || 'ใส่ลิงก์รับชม แก้ชื่อไทย เปลี่ยนสถานะ หรือย้ายหมวด แล้วกดบันทึกด้านล่างใน modal นี้'}</p>
            </div>
          </div>
        </section>

        {report ? (
          <section className="mx-4 rounded-[22px] bg-red-500/[0.085] p-4 shadow-inner md:mx-6">
            <p className="text-xs font-black text-red-100">รายงานจากผู้ใช้</p>
            <p className="mt-1 text-sm font-bold text-white/70">{report.reason} • {formatDate(report.created_at)}</p>
            {report.detail ? <p className="mt-2 text-xs font-semibold leading-5 text-white/46">{report.detail}</p> : null}
          </section>
        ) : null}

        <section className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
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
          <label className="block">
            <FieldLabel>ชื่ออังกฤษ / ชื่อหลัก</FieldLabel>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Original title" className={inputClass()} />
          </label>
          <label className="block">
            <FieldLabel>ชื่อไทยที่โชว์บนเว็บ</FieldLabel>
            <input value={form.title_th} onChange={(event) => setForm({ ...form, title_th: event.target.value })} placeholder="ชื่อไทย" className={inputClass()} />
          </label>
          <label className="block md:col-span-2">
            <FieldLabel>ลิงก์รับชม / Google Drive Preview</FieldLabel>
            <input value={form.watch_url} onChange={(event) => setForm({ ...form, watch_url: event.target.value })} placeholder="https://drive.google.com/file/d/.../view" className={inputClass()} />
          </label>
          <label className="block md:col-span-2">
            <FieldLabel>ลิงก์ตัวอย่าง / Trailer URL</FieldLabel>
            <input value={form.trailer_url} onChange={(event) => setForm({ ...form, trailer_url: event.target.value })} placeholder="YouTube / Drive / mp4" className={inputClass()} />
          </label>
          <label className="block">
            <FieldLabel>หมวดแนะนำ</FieldLabel>
            <select value={form.section_slug} onChange={(event) => setForm({ ...form, section_slug: event.target.value })} className={inputClass()}>
              <option value="watch-ready">Watch Ready</option>
              <option value="now-playing">มาใหม่</option>
              <option value="popular">ยอดนิยม</option>
              <option value="thai">หนังไทย</option>
              <option value="top-rated">คะแนนสูง</option>
              <option value="series">ซีรีส์</option>
            </select>
          </label>
          <label className="block">
            <FieldLabel>สถานะ</FieldLabel>
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as MovieStatus })} className={inputClass()}>
              <option value="published">Published / พร้อมดู</option>
              <option value="review">Review / รอตรวจ</option>
              <option value="draft">Draft / ยังไม่เผยแพร่</option>
              <option value="broken">Broken / ลิงก์เสีย</option>
              <option value="hidden">Hidden / ซ่อน</option>
            </select>
          </label>
          <label className="block md:col-span-2">
            <FieldLabel>หมายเหตุ</FieldLabel>
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="เช่น พากย์ไทย / ซับไทย / ไฟล์ส่วนตัว / แก้จาก report" className={textAreaClass()} />
          </label>
        </section>

        <div className="sticky bottom-0 flex flex-col gap-3 bg-[#050505]/86 p-4 shadow-[0_-24px_80px_rgba(0,0,0,0.82)] backdrop-blur-2xl md:flex-row md:items-center md:justify-between md:px-6">
          <p className="text-xs font-bold text-white/38">กดบันทึกแล้วระบบจะอัปเดต Supabase และรีโหลดรายการในหน้าแอดมิน</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-11 rounded-2xl bg-white/[0.08] px-5 text-xs font-black text-white/62 hover:bg-white/[0.12] hover:text-white">ยกเลิก</button>
            <button type="submit" disabled={saving} className="h-11 rounded-2xl bg-[#e50914] px-7 text-xs font-black text-white shadow-glow disabled:opacity-50">{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export function AdminCmsDashboard() {
  const [adminToken, setAdminToken] = useState('');
  const [links, setLinks] = useState<AdminMovieLink[]>([]);
  const [reports, setReports] = useState<LinkReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missingVisible, setMissingVisible] = useState(12);
  const [brokenVisible, setBrokenVisible] = useState(12);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorForm, setEditorForm] = useState<EditorForm>(emptyForm);
  const [activeReport, setActiveReport] = useState<LinkReport | undefined>();

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

  function openEditor(item?: AdminMovieLink, report?: LinkReport) {
    setEditorForm(item ? itemToForm(item) : emptyForm);
    setActiveReport(report);
    setEditorOpen(true);
  }

  async function saveEditor(event: FormEvent<HTMLFormElement>) {
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
        body: JSON.stringify({ ...editorForm, tmdb_id: Number(editorForm.tmdb_id) }),
      });
      const payload = (await response.json()) as AdminPayload & { link?: AdminMovieLink };

      if (!response.ok || !payload.ok) throw new Error(payload.error || 'บันทึกไม่สำเร็จ');
      setMessage(`บันทึก ${payload.link?.title_th || payload.link?.title || `TMDB ${editorForm.tmdb_id}`} แล้ว`);
      setEditorOpen(false);
      setEditorForm(emptyForm);
      setActiveReport(undefined);
      await loadDashboard(adminToken.trim());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    const ready = links.filter((item) => item.is_active && item.status === 'published' && item.watch_url).length;
    const missing = links.filter((item) => !item.watch_url).length;
    const review = links.filter((item) => item.status === 'review' || item.status === 'draft').length;
    const broken = links.filter((item) => item.status === 'broken').length + reports.filter((report) => report.status === 'pending').length;

    return [
      { label: 'ทั้งหมด', value: links.length ? String(links.length) : '1,240', helper: links.length ? 'ในระบบจริง' : 'ตัวอย่าง', tone: 'from-[#e50914] to-[#7a050b]' },
      { label: 'พร้อมดู', value: links.length ? String(ready) : '86', helper: 'มี watch_url', tone: 'from-[#f4c46b] to-[#8b5d12]' },
      { label: 'ยังไม่มีลิงก์', value: links.length ? String(missing) : '12', helper: `${review} รอตรวจ`, tone: 'from-white/20 to-white/5' },
      { label: 'ลิงก์เสีย', value: links.length || reports.length ? String(broken) : '14', helper: 'Report + Broken', tone: 'from-[#ef4444] to-[#4c0508]' },
    ];
  }, [links, reports]);

  const missingCards = useMemo(() => {
    const source = links.length ? links.filter((item) => !item.watch_url || item.status === 'draft' || item.status === 'review') : fallbackMissing;
    return source.map(toMissingCard);
  }, [links]);

  const brokenCards = useMemo(() => {
    const cards: AdminCard[] = [];
    const brokenLinks = links.length ? links.filter((item) => item.status === 'broken') : fallbackBroken;
    cards.push(...brokenLinks.map((item) => toBrokenCard(item)));

    for (const report of reports) {
      const matched = links.find((item) => item.tmdb_id === report.tmdb_id && item.media_type === report.media_type);
      const item = matched || {
        id: '',
        tmdb_id: report.tmdb_id || 0,
        media_type: report.media_type,
        title: report.title || null,
        title_th: report.title_th || report.title || null,
        watch_url: report.url || null,
        trailer_url: null,
        provider: 'report',
        is_active: true,
        notes: report.detail || report.reason,
        section_slug: 'watch-ready',
        status: 'broken' as MovieStatus,
        created_at: report.created_at,
        updated_at: report.updated_at,
      };
      cards.push(toBrokenCard(item, report));
    }

    return cards;
  }, [links, reports]);

  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <section className="relative overflow-hidden px-4 py-8 md:px-8 md:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(229,9,20,0.24),transparent_30rem),radial-gradient(circle_at_82%_10%,rgba(244,196,107,0.12),transparent_24rem),linear-gradient(180deg,#050000,#030303)]" />
        <div className="relative z-10 mx-auto max-w-[1600px]">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <a href="/" className="text-xs font-black text-red-200/70 hover:text-red-100">← กลับหน้าแรก</a>
              <p className="mt-7 text-[10px] font-black uppercase tracking-[0.34em] text-[#e50914] md:text-xs">DOFree Admin CMS</p>
              <h1 className="mt-3 max-w-4xl text-[42px] font-black leading-[0.9] tracking-[-0.08em] md:text-[76px]">จัดการหนังและลิงก์รับชม</h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/56 md:text-lg md:leading-8">
                โฟกัสงานจริงของแอดมิน: ดูเรื่องที่ยังไม่มีลิงก์, แก้เรื่องที่ถูกแจ้งว่าเสีย และเปิด modal เพื่อใส่ข้อมูลให้ครบก่อนเผยแพร่
              </p>
            </div>
            <div className="rounded-[24px] bg-white/[0.045] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.72)] ring-1 ring-white/[0.06] backdrop-blur-2xl md:w-[380px]">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/38">Admin Access</p>
              <input value={adminToken} onChange={(event) => setAdminToken(event.target.value)} type="password" placeholder="DOFREE_ADMIN_TOKEN" className={inputClass()} />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={saveToken} disabled={loading} className="h-10 rounded-xl bg-[#e50914] text-xs font-black text-white shadow-glow disabled:opacity-45">{loading ? 'กำลังโหลด' : 'เชื่อมข้อมูล'}</button>
                <button type="button" onClick={() => loadDashboard()} disabled={loading} className="h-10 rounded-xl bg-white/[0.08] text-xs font-black text-white/70 disabled:opacity-45">รีเฟรช</button>
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

      <section className="mx-auto max-w-[1600px] space-y-6 px-4 pb-12 md:px-8">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <article key={item.label} className="overflow-hidden rounded-[18px] bg-white/[0.045] p-3 shadow-[0_14px_45px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.055] md:p-4">
              <div className={`h-1 rounded-full bg-gradient-to-r ${item.tone}`} />
              <p className="mt-3 text-[10px] font-black text-white/42">{item.label}</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.06em] md:text-3xl">{item.value}</h2>
              <p className="mt-1 text-[10px] font-semibold text-white/42 md:text-xs">{item.helper}</p>
            </article>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-white/[0.035] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.055] backdrop-blur-2xl md:p-4">
          <div>
            <p className="text-xs font-black text-white/72">เพิ่มรายการใหม่แบบเร็ว</p>
            <p className="mt-1 text-[11px] font-semibold text-white/36">กดแล้วกรอก TMDB ID และลิงก์ใน modal เดียว</p>
          </div>
          <button type="button" onClick={() => openEditor()} className="h-11 rounded-2xl bg-[#e50914] px-5 text-xs font-black text-white shadow-glow">+ เพิ่มหนัง</button>
        </div>

        <MovieGridSection
          eyebrow="Need Watch Link"
          title="หนังที่ยังไม่มีลิงก์หนัง"
          description="เรียง 4 การ์ดต่อแถวบนจอใหญ่ แสดง 3 แถวแรกก่อน ถ้ามีเยอะให้กดดูเพิ่มเติม แล้วคลิกการ์ดเพื่อใส่ลิงก์และเปลี่ยนสถานะเป็นพร้อมดู"
          cards={missingCards}
          visibleCount={missingVisible}
          onMore={() => setMissingVisible((count) => count + 12)}
          onOpen={(card) => openEditor(card.item, card.report)}
        />

        <MovieGridSection
          eyebrow="Broken Reports"
          title="หนังที่ถูกแจ้งว่าลิงก์เสีย"
          description="รวมรายการสถานะ Broken และ report จากผู้ใช้ คลิกการ์ดเพื่อเปลี่ยนลิงก์ใหม่หรือแก้สถานะกลับเป็น Published"
          cards={brokenCards}
          visibleCount={brokenVisible}
          onMore={() => setBrokenVisible((count) => count + 12)}
          onOpen={(card) => openEditor(card.item, card.report)}
        />
      </section>

      {editorOpen ? (
        <EditorModal
          form={editorForm}
          setForm={setEditorForm}
          saving={saving}
          onClose={() => { setEditorOpen(false); setActiveReport(undefined); }}
          onSubmit={saveEditor}
          report={activeReport}
        />
      ) : null}
    </main>
  );
}
