'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  adminFrontItemName,
  adminFrontSections,
  toAdminFrontForm,
  type AdminFrontForm,
  type AdminFrontItem,
  type AdminFrontStatus,
} from '@/components/admin-front-manager-types';
import { adminSessionHeaders } from '@/lib/admin-session-browser';
import { adminInputClassSm, adminSelectClassSm, adminTextareaClass } from '@/lib/admin-ui-classes';

type Props = {
  item: AdminFrontItem | null;
  onClose: () => void;
  onSaved: (item: AdminFrontItem) => void;
};

type SaveResponse = {
  ok: boolean;
  link?: AdminFrontItem;
  error?: string;
};

const statuses: AdminFrontStatus[] = ['draft', 'review', 'published', 'broken', 'hidden'];

function fieldPayload(form: AdminFrontForm) {
  return {
    tmdb_id: Number(form.tmdb_id),
    media_type: form.media_type,
    title: form.title,
    title_th: form.title_th,
    watch_url: form.watch_url,
    trailer_url: form.trailer_url,
    provider: form.provider || 'admin',
    section_slug: form.section_slug || 'watch-ready',
    status: form.status,
    notes: form.notes,
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/42">{label}</span>
      {children}
    </label>
  );
}

export function AdminFrontManagerPanel({ item, onClose, onSaved }: Props) {
  const [form, setForm] = useState<AdminFrontForm | null>(item ? toAdminFrontForm(item) : null);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(item ? toAdminFrontForm(item) : null);
    setMessage('');
    setError('');
    setSaving('');
  }, [item]);

  const title = useMemo(() => (item ? adminFrontItemName(item) : ''), [item]);

  if (!item || !form) return null;

  const setValue = <K extends keyof AdminFrontForm>(key: K, value: AdminFrontForm[K]) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
  };

  const save = async (label: string) => {
    setSaving(label);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/movie-links', {
        method: 'POST',
        headers: adminSessionHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(fieldPayload(form)),
      });
      const payload = (await response.json()) as SaveResponse;
      if (!response.ok || !payload.ok || !payload.link) throw new Error(payload.error || 'บันทึกไม่สำเร็จ');
      onSaved({ ...item, ...payload.link });
      setForm(toAdminFrontForm({ ...item, ...payload.link }));
      setMessage(`บันทึก${label}แล้ว`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving('');
    }
  };

  const copy = async (value: string) => {
    if (!value) return;
    await navigator.clipboard?.writeText(value).catch(() => undefined);
    setMessage('คัดลอกลิงก์แล้ว');
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="ปิด panel" />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-white/10 bg-[#050505] text-white shadow-2xl">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e50914]">{form.media_type} · TMDB {form.tmdb_id}</p>
              <h2 className="mt-2 line-clamp-2 text-2xl font-black tracking-[-0.04em]">{title}</h2>
              <p className="mt-1 text-xs font-bold text-white/45">แก้ไขจากโหมดแอดมิน ไม่พาไปหน้ารายละเอียดจริง</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white/72 hover:bg-white/[0.14] hover:text-white">ปิด</button>
          </div>
          {message ? <p className="mt-3 rounded-xl bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-100">{message}</p> : null}
          {error ? <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-black text-red-100">{error}</p> : null}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-4">
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-black">ข้อมูลพื้นฐาน</h3>
                <button type="button" disabled={Boolean(saving)} onClick={() => void save('ข้อมูลพื้นฐาน')} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-black disabled:opacity-50">{saving === 'ข้อมูลพื้นฐาน' ? 'Saving...' : 'บันทึก'}</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Title TH"><input className={adminInputClassSm} value={form.title_th} onChange={(event) => setValue('title_th', event.target.value)} /></Field>
                <Field label="Title EN"><input className={adminInputClassSm} value={form.title} onChange={(event) => setValue('title', event.target.value)} /></Field>
                <Field label="TMDB ID"><input className={adminInputClassSm} value={form.tmdb_id} readOnly /></Field>
                <Field label="Media Type"><input className={adminInputClassSm} value={form.media_type} readOnly /></Field>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-black">ลิงก์รับชม</h3>
                <button type="button" disabled={Boolean(saving)} onClick={() => void save('ลิงก์')} className="rounded-xl bg-[#e50914] px-3 py-2 text-xs font-black text-white disabled:opacity-50">{saving === 'ลิงก์' ? 'Saving...' : 'บันทึกลิงก์'}</button>
              </div>
              <div className="grid gap-3">
                <Field label="Watch URL"><input className={adminInputClassSm} value={form.watch_url} onChange={(event) => setValue('watch_url', event.target.value)} placeholder="Google Drive preview / embed / direct URL" /></Field>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => form.watch_url && window.open(form.watch_url, '_blank', 'noopener,noreferrer')} className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white/72">Test</button>
                  <button type="button" onClick={() => void copy(form.watch_url)} className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white/72">Copy</button>
                  <button type="button" onClick={() => setValue('watch_url', '')} className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white/72">Clear</button>
                </div>
                <Field label="Trailer URL"><input className={adminInputClassSm} value={form.trailer_url} onChange={(event) => setValue('trailer_url', event.target.value)} /></Field>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Provider"><input className={adminInputClassSm} value={form.provider} onChange={(event) => setValue('provider', event.target.value)} /></Field>
                  <Field label="Status"><select className={adminSelectClassSm} value={form.status} onChange={(event) => setValue('status', event.target.value as AdminFrontStatus)}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></Field>
                </div>
                <Field label="Notes"><textarea className={`${adminTextareaClass} min-h-24`} value={form.notes} onChange={(event) => setValue('notes', event.target.value)} /></Field>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-black">หมวดหมู่ / สถานะ</h3>
                <button type="button" disabled={Boolean(saving)} onClick={() => void save('หมวดหมู่และสถานะ')} className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white disabled:opacity-50">บันทึก</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Section"><select className={adminSelectClassSm} value={form.section_slug} onChange={(event) => setValue('section_slug', event.target.value)}>{adminFrontSections.map((section) => <option key={section} value={section}>{section}</option>)}</select></Field>
                <Field label="Source Bucket"><input className={adminInputClassSm} value={form.source_bucket} readOnly /></Field>
                <Field label="Source Buckets"><input className={adminInputClassSm} value={form.source_buckets} readOnly /></Field>
                <Field label="Genres"><input className={adminInputClassSm} value={form.genres} readOnly /></Field>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="mb-3 text-sm font-black">ภาพและ metadata</h3>
              <div className="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
                {form.poster_url ? <img src={form.poster_url} alt={title} className="aspect-[2/3] w-full rounded-xl object-cover" /> : <div className="aspect-[2/3] rounded-xl bg-white/[0.06]" />}
                <div className="grid gap-3">
                  <Field label="Poster URL"><input className={adminInputClassSm} value={form.poster_url} readOnly /></Field>
                  <Field label="Backdrop URL"><input className={adminInputClassSm} value={form.backdrop_url} readOnly /></Field>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Rating"><input className={adminInputClassSm} value={form.rating} readOnly /></Field>
                    <Field label="Year"><input className={adminInputClassSm} value={form.year} readOnly /></Field>
                    <Field label="Language"><input className={adminInputClassSm} value={form.language} readOnly /></Field>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </aside>
    </div>
  );
}
