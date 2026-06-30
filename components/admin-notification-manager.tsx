'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { adminInputClass, adminSelectClass, adminTextareaClass } from '@/lib/admin-ui-classes';
import { adminSessionHeaders } from '@/lib/admin-session-browser';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  detail?: string | null;
  type?: string | null;
  priority?: number | null;
  audience?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  secondary_cta_label?: string | null;
  secondary_cta_url?: string | null;
  image_url?: string | null;
  related_media_type?: string | null;
  related_tmdb_id?: number | null;
  publish_at?: string | null;
  expires_at?: string | null;
  enabled: boolean;
  pinned?: boolean | null;
  sort_order?: number | null;
  updated_at?: string | null;
};

type NotificationDraft = Omit<NotificationItem, 'id' | 'updated_at'> & { id?: string };

type Payload = {
  ok: boolean;
  notifications?: NotificationItem[];
  notification?: NotificationItem;
  total?: number;
  error?: string;
};

const typeOptions = ['general', 'system', 'new_release', 'episode_update', 'premium', 'maintenance', 'help', 'promotion'];
const audienceOptions = ['all', 'guest', 'user', 'premium', 'admin'];
const statusOptions = ['all', 'active', 'scheduled', 'expired', 'disabled'];

const emptyDraft: NotificationDraft = {
  title: '',
  message: '',
  detail: '',
  type: 'general',
  priority: 0,
  audience: 'all',
  cta_label: '',
  cta_url: '',
  secondary_cta_label: '',
  secondary_cta_url: '',
  image_url: '',
  related_media_type: '',
  related_tmdb_id: null,
  publish_at: '',
  expires_at: '',
  enabled: true,
  pinned: false,
  sort_order: 0,
};

function notificationStatus(item: NotificationItem | NotificationDraft, now = new Date()) {
  if (!item.enabled) return 'disabled';
  const publishAt = item.publish_at ? new Date(item.publish_at) : null;
  const expiresAt = item.expires_at ? new Date(item.expires_at) : null;
  if (expiresAt && expiresAt.getTime() <= now.getTime()) return 'expired';
  if (publishAt && publishAt.getTime() > now.getTime()) return 'scheduled';
  return 'active';
}

function dateInputValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toDraft(item: NotificationItem): NotificationDraft {
  return {
    ...emptyDraft,
    ...item,
    publish_at: dateInputValue(item.publish_at),
    expires_at: dateInputValue(item.expires_at),
    related_tmdb_id: item.related_tmdb_id || null,
  };
}

function cleanDraft(draft: NotificationDraft) {
  return {
    ...draft,
    detail: draft.detail || null,
    cta_label: draft.cta_label || null,
    cta_url: draft.cta_url || null,
    secondary_cta_label: draft.secondary_cta_label || null,
    secondary_cta_url: draft.secondary_cta_url || null,
    image_url: draft.image_url || null,
    related_media_type: draft.related_media_type || null,
    related_tmdb_id: draft.related_tmdb_id ? Number(draft.related_tmdb_id) : null,
    priority: Number(draft.priority || 0),
    sort_order: Number(draft.sort_order || 0),
    publish_at: draft.publish_at || null,
    expires_at: draft.expires_at || null,
  };
}

function formatDate(value?: string | null) {
  if (!value) return 'Any time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

function badgeClass(status: string) {
  if (status === 'active') return 'bg-emerald-400/12 text-emerald-100';
  if (status === 'scheduled') return 'bg-sky-400/12 text-sky-100';
  if (status === 'expired') return 'bg-orange-400/12 text-orange-100';
  return 'bg-white/[0.08] text-white/54';
}

function fieldLabel(label: string, children: ReactNode) {
  return (
    <label className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white/42">
      {label}
      {children}
    </label>
  );
}

function Preview({ item }: { item: NotificationDraft }) {
  const status = notificationStatus(item);

  return (
    <article className="rounded-2xl border border-white/10 bg-black/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-[#e50914]/14 px-2.5 py-1 text-[10px] font-black uppercase text-red-100">{item.type || 'general'}</span>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${badgeClass(status)}`}>{status}</span>
            {item.pinned ? <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase text-black">Pinned</span> : null}
          </div>
          <h3 className="mt-3 break-words text-lg font-black text-white">{item.title || 'Notification title'}</h3>
          <p className="mt-1 break-words text-sm font-semibold leading-6 text-white/64">{item.message || 'Short message shown in the bell.'}</p>
        </div>
        {item.priority ? <span className="rounded-xl bg-white/[0.08] px-2.5 py-1 text-xs font-black text-white/64">P{item.priority}</span> : null}
      </div>
      {item.image_url ? (
        <div className="mt-3 aspect-[16/9] overflow-hidden rounded-xl bg-white/[0.06]">
          <img src={item.image_url} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
      {item.detail ? <p className="mt-3 break-words text-xs font-semibold leading-5 text-white/48">{item.detail}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {item.cta_label && item.cta_url ? <span className="rounded-xl bg-[#e50914] px-3 py-2 text-xs font-black text-white">{item.cta_label}</span> : null}
        {item.secondary_cta_label && item.secondary_cta_url ? <span className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white/78">{item.secondary_cta_label}</span> : null}
      </div>
    </article>
  );
}

export function AdminNotificationManager() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<NotificationDraft | null>(null);

  const total = items.length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (type && item.type !== type) return false;
      if (status !== 'all' && notificationStatus(item) !== status) return false;
      if (!q) return true;
      return [item.title, item.message, item.detail, item.cta_label, item.cta_url, item.type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [items, query, status, type]);

  async function loadNotifications() {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ status: 'all', limit: '100' });
      const response = await fetch(`/api/admin/notifications?${params.toString()}`, {
        headers: adminSessionHeaders(),
        cache: 'no-store',
      });
      const payload = (await response.json()) as Payload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Cannot load notifications');
      setItems(payload.notifications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot load notifications');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  useEffect(() => {
    if (!draft) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDraft(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [draft]);

  function updateDraft(patch: Partial<NotificationDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  async function saveDraft() {
    if (!draft) return;
    setSaving(true);
    setError('');

    try {
      const payload = cleanDraft(draft);
      const editing = Boolean(draft.id);
      const response = await fetch(editing ? `/api/admin/notifications/${encodeURIComponent(draft.id || '')}` : '/api/admin/notifications', {
        method: editing ? 'PUT' : 'POST',
        headers: adminSessionHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as Payload;
      if (!response.ok || !result.ok) throw new Error(result.error || 'Cannot save notification');
      setDraft(null);
      await loadNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot save notification');
    } finally {
      setSaving(false);
    }
  }

  async function disableNotification(item: NotificationItem) {
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/notifications/${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
        headers: adminSessionHeaders(),
      });
      const result = (await response.json()) as Payload;
      if (!response.ok || !result.ok) throw new Error(result.error || 'Cannot disable notification');
      await loadNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot disable notification');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-4 text-white md:px-8 md:py-6">
      <div className="admin-floating-glass rounded-2xl border border-white/8 p-3 md:rounded-[28px] md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/36">Notification Manager</p>
            <h2 className="mt-1 text-lg font-black tracking-[-0.03em]">Bell announcements</h2>
            <p className="mt-1 text-xs font-semibold text-white/42">{total} saved notifications</p>
          </div>
          <button
            type="button"
            onClick={() => setDraft({ ...emptyDraft })}
            className="rounded-xl bg-[#e50914] px-4 py-2 text-xs font-black text-white shadow-glow"
          >
            + Create notification
          </button>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-[1fr_170px_170px_auto]">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, message, CTA" className={adminInputClass} />
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={adminSelectClass}>
            {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={type} onChange={(event) => setType(event.target.value)} className={adminSelectClass}>
            <option value="">all types</option>
            {typeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <button type="button" onClick={loadNotifications} className="rounded-xl bg-white/[0.08] px-4 py-2 text-xs font-black text-white/72 hover:bg-white/[0.14]">Refresh</button>
        </div>

        {error ? <div className="mt-4 rounded-2xl border border-[#e50914]/30 bg-[#170203]/70 p-4 text-sm font-black text-red-100">{error}</div> : null}

        <div className="mt-4 grid gap-3">
          {loading ? (
            <div className="rounded-2xl bg-black/35 p-5 text-sm font-black text-white/46">Loading notifications...</div>
          ) : filtered.length ? filtered.map((item) => {
            const currentStatus = notificationStatus(item);
            return (
              <article key={item.id} className="rounded-2xl border border-white/8 bg-black/35 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[10px] font-black uppercase text-white/58">{item.type || 'general'}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${badgeClass(currentStatus)}`}>{currentStatus}</span>
                      {item.pinned ? <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase text-black">Pinned</span> : null}
                    </div>
                    <h3 className="mt-2 break-words text-base font-black text-white">{item.title}</h3>
                    <p className="mt-1 break-words text-sm font-semibold leading-6 text-white/54">{item.message}</p>
                    <div className="mt-3 grid gap-1 text-[11px] font-bold text-white/34 md:grid-cols-2">
                      <span>Schedule: {formatDate(item.publish_at)} - {item.expires_at ? formatDate(item.expires_at) : 'No expiry'}</span>
                      <span>Priority {item.priority || 0} / Sort {item.sort_order || 0}</span>
                      <span>CTA: {item.cta_label || '-'} {item.secondary_cta_label ? `+ ${item.secondary_cta_label}` : ''}</span>
                      <span>Updated: {formatDate(item.updated_at)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => setDraft(toDraft(item))} className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white/72 hover:bg-white/[0.14]">Edit</button>
                    <button type="button" onClick={() => void disableNotification(item)} disabled={!item.enabled || saving} className="rounded-xl bg-[#e50914]/16 px-3 py-2 text-xs font-black text-red-100 disabled:opacity-40">Disable</button>
                  </div>
                </div>
              </article>
            );
          }) : (
            <div className="rounded-2xl bg-black/35 p-5 text-sm font-black text-white/46">No notifications match these filters.</div>
          )}
        </div>
      </div>

      {draft ? (
        <div className="fixed inset-0 z-[1200] overflow-y-auto bg-black/70 p-3 backdrop-blur-xl" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setDraft(null);
        }}>
          <div className="mx-auto my-4 grid w-full max-w-5xl gap-3 rounded-2xl border border-white/10 bg-[#070707] p-3 shadow-[0_28px_100px_rgba(0,0,0,0.75)] md:my-8 md:grid-cols-[1.35fr_0.65fr] md:p-5">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">{draft.id ? 'Edit notification' : 'Create notification'}</h3>
                <button type="button" onClick={() => setDraft(null)} className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.08] text-xl font-black text-white/70">x</button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {fieldLabel('Title', <input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} className={adminInputClass} />)}
                {fieldLabel('Type', <select value={draft.type || 'general'} onChange={(event) => updateDraft({ type: event.target.value })} className={adminSelectClass}>{typeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>)}
                <div className="md:col-span-2">{fieldLabel('Message', <textarea value={draft.message} onChange={(event) => updateDraft({ message: event.target.value })} rows={3} className={adminTextareaClass} />)}</div>
                <div className="md:col-span-2">{fieldLabel('Detail', <textarea value={draft.detail || ''} onChange={(event) => updateDraft({ detail: event.target.value })} rows={3} className={adminTextareaClass} />)}</div>
                {fieldLabel('Audience', <select value={draft.audience || 'all'} onChange={(event) => updateDraft({ audience: event.target.value })} className={adminSelectClass}>{audienceOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>)}
                {fieldLabel('Image URL', <input value={draft.image_url || ''} onChange={(event) => updateDraft({ image_url: event.target.value })} className={adminInputClass} />)}
                {fieldLabel('CTA Label', <input value={draft.cta_label || ''} onChange={(event) => updateDraft({ cta_label: event.target.value })} className={adminInputClass} />)}
                {fieldLabel('CTA URL', <input value={draft.cta_url || ''} onChange={(event) => updateDraft({ cta_url: event.target.value })} className={adminInputClass} />)}
                {fieldLabel('Secondary CTA Label', <input value={draft.secondary_cta_label || ''} onChange={(event) => updateDraft({ secondary_cta_label: event.target.value })} className={adminInputClass} />)}
                {fieldLabel('Secondary CTA URL', <input value={draft.secondary_cta_url || ''} onChange={(event) => updateDraft({ secondary_cta_url: event.target.value })} className={adminInputClass} />)}
                {fieldLabel('Related Media Type', <select value={draft.related_media_type || ''} onChange={(event) => updateDraft({ related_media_type: event.target.value })} className={adminSelectClass}><option value="">none</option><option value="movie">movie</option><option value="tv">tv</option></select>)}
                {fieldLabel('Related TMDB ID', <input type="number" value={draft.related_tmdb_id || ''} onChange={(event) => updateDraft({ related_tmdb_id: event.target.value ? Number(event.target.value) : null })} className={adminInputClass} />)}
                {fieldLabel('Publish At', <input type="datetime-local" value={draft.publish_at || ''} onChange={(event) => updateDraft({ publish_at: event.target.value })} className={adminInputClass} />)}
                {fieldLabel('Expires At', <input type="datetime-local" value={draft.expires_at || ''} onChange={(event) => updateDraft({ expires_at: event.target.value })} className={adminInputClass} />)}
                {fieldLabel('Priority', <input type="number" value={draft.priority || 0} onChange={(event) => updateDraft({ priority: Number(event.target.value) })} className={adminInputClass} />)}
                {fieldLabel('Sort Order', <input type="number" value={draft.sort_order || 0} onChange={(event) => updateDraft({ sort_order: Number(event.target.value) })} className={adminInputClass} />)}
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-black text-white/70">
                  <input type="checkbox" checked={Boolean(draft.pinned)} onChange={(event) => updateDraft({ pinned: event.target.checked })} />
                  Pinned
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-black text-white/70">
                  <input type="checkbox" checked={Boolean(draft.enabled)} onChange={(event) => updateDraft({ enabled: event.target.checked })} />
                  Enabled
                </label>
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => setDraft(null)} className="rounded-xl bg-white/[0.08] px-4 py-2 text-xs font-black text-white/70">Cancel</button>
                <button type="button" onClick={() => void saveDraft()} disabled={saving} className="rounded-xl bg-[#e50914] px-4 py-2 text-xs font-black text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
            <aside className="min-w-0">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/36">Preview</p>
              <Preview item={draft} />
            </aside>
          </div>
        </div>
      ) : null}
    </section>
  );
}
