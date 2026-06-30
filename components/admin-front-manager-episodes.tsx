'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  emptyEpisodeForm,
  episodeRowKey,
  sortEpisodes,
  type AdminEpisodeDraft,
  type AdminEpisodeForm,
  type AdminFrontItem,
  type AdminFrontStatus,
  type AdminSeriesEpisode,
} from '@/components/admin-front-manager-types';
import { adminSessionHeaders } from '@/lib/admin-session-browser';
import { adminInputClassSm, adminSelectClassSm, adminTextareaClass } from '@/lib/admin-ui-classes';

type Props = {
  item: AdminFrontItem;
  provider?: string;
};

type EpisodeResponse = {
  ok: boolean;
  episodes?: AdminSeriesEpisode[];
  episode?: AdminSeriesEpisode;
  saved?: number;
  error?: string;
};

const statuses: AdminFrontStatus[] = ['draft', 'review', 'published', 'broken', 'hidden'];

function toForm(episode?: AdminSeriesEpisode, provider = 'admin'): AdminEpisodeForm {
  return {
    season_number: String(episode?.season_number || 1),
    episode_number: String(episode?.episode_number || 1),
    episode_title: episode?.episode_title || '',
    watch_url: episode?.watch_url || '',
    trailer_url: episode?.trailer_url || '',
    provider: episode?.provider || provider || 'admin',
    notes: episode?.notes || '',
    status: episode?.status || 'published',
  };
}

function toPayload(tmdbId: number, form: AdminEpisodeForm) {
  return {
    tmdb_id: tmdbId,
    season_number: Number(form.season_number || 1),
    episode_number: Number(form.episode_number || 1),
    episode_title: form.episode_title,
    watch_url: form.watch_url,
    trailer_url: form.trailer_url,
    provider: form.provider || 'admin',
    notes: form.notes,
    status: form.status,
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

export function AdminFrontManagerEpisodes({ item, provider = 'admin' }: Props) {
  const [episodes, setEpisodes] = useState<AdminSeriesEpisode[]>([]);
  const [selected, setSelected] = useState<AdminSeriesEpisode | null>(null);
  const [form, setForm] = useState<AdminEpisodeForm>(emptyEpisodeForm(provider));
  const [drafts, setDrafts] = useState<AdminEpisodeDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const enabled = item.media_type === 'tv';

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`/api/admin/series-episodes?tmdbId=${item.tmdb_id}`, {
      headers: adminSessionHeaders(),
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as EpisodeResponse;
        if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลดตอนไม่สำเร็จ');
        setEpisodes(sortEpisodes(payload.episodes || []));
      })
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') setError(err instanceof Error ? err.message : 'โหลดตอนไม่สำเร็จ');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [enabled, item.tmdb_id]);

  useEffect(() => {
    setSelected(null);
    setForm(emptyEpisodeForm(provider));
    setDrafts([]);
    setMessage('');
    setError('');
  }, [item.tmdb_id, provider]);

  const nextEpisodeNumber = useMemo(() => {
    const current = Math.max(0, ...episodes.filter((episode) => episode.season_number === Number(form.season_number || 1)).map((episode) => episode.episode_number));
    const draftMax = Math.max(0, ...drafts.filter((draft) => Number(draft.season_number || 1) === Number(form.season_number || 1)).map((draft) => Number(draft.episode_number || 0)));
    return Math.max(current, draftMax) + 1;
  }, [drafts, episodes, form.season_number]);

  if (!enabled) return null;

  const setValue = <K extends keyof AdminEpisodeForm>(key: K, value: AdminEpisodeForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const pickEpisode = (episode: AdminSeriesEpisode) => {
    setSelected(episode);
    setForm(toForm(episode, provider));
    setMessage('');
    setError('');
  };

  const addDrafts = (count: number) => {
    const season = form.season_number || '1';
    const next = Array.from({ length: count }, (_, index) => ({
      ...emptyEpisodeForm(provider),
      draft_key: `draft-${Date.now()}-${index}`,
      season_number: season,
      episode_number: String(nextEpisodeNumber + index),
    }));
    setDrafts((current) => [...current, ...next]);
  };

  const saveOne = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/series-episodes', {
        method: 'POST',
        headers: adminSessionHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(toPayload(item.tmdb_id, form)),
      });
      const payload = (await response.json()) as EpisodeResponse;
      if (!response.ok || !payload.ok || !payload.episode) throw new Error(payload.error || 'บันทึกตอนไม่สำเร็จ');
      setEpisodes((current) => sortEpisodes([...current.filter((episode) => !(episode.season_number === payload.episode?.season_number && episode.episode_number === payload.episode?.episode_number)), payload.episode as AdminSeriesEpisode]));
      setSelected(payload.episode);
      setForm(toForm(payload.episode, provider));
      setMessage('บันทึกตอนแล้ว');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกตอนไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const saveDrafts = async () => {
    if (!drafts.length) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/series-episodes', {
        method: 'POST',
        headers: adminSessionHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ tmdb_id: item.tmdb_id, episodes: drafts.map((draft) => toPayload(item.tmdb_id, draft)) }),
      });
      const payload = (await response.json()) as EpisodeResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'บันทึกหลายตอนไม่สำเร็จ');
      setEpisodes((current) => sortEpisodes([...(payload.episodes || []), ...current]));
      setDrafts([]);
      setMessage(`บันทึก ${payload.saved || 0} ตอนแล้ว`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกหลายตอนไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black">จัดการตอนซีรีส์</h3>
          <p className="mt-1 text-xs font-bold text-white/42">โหลดเฉพาะตอนเปิด panel ของซีรีส์นี้</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => addDrafts(1)} className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white/72">เพิ่มตอน</button>
          <button type="button" onClick={() => addDrafts(5)} className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white/72">เพิ่ม 5</button>
          <button type="button" onClick={() => addDrafts(10)} className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white/72">เพิ่ม 10</button>
        </div>
      </div>

      {message ? <p className="mb-3 rounded-xl bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-100">{message}</p> : null}
      {error ? <p className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-black text-red-100">{error}</p> : null}

      <div className="grid gap-4">
        <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10">
          {loading ? <p className="p-3 text-xs font-black text-white/45">กำลังโหลดตอน...</p> : null}
          {!loading && !episodes.length ? <p className="p-3 text-xs font-black text-white/45">ยังไม่มีตอนที่บันทึก</p> : null}
          {episodes.map((episode) => (
            <button key={episodeRowKey(episode)} type="button" onClick={() => pickEpisode(episode)} className="grid w-full grid-cols-[70px_minmax(0,1fr)_auto] gap-2 border-b border-white/10 px-3 py-2 text-left text-xs font-bold text-white/72 hover:bg-white/[0.06]">
              <span>S{episode.season_number}E{episode.episode_number}</span>
              <span className="truncate">{episode.episode_title || episode.watch_url || '-'}</span>
              <span className="text-white/42">{episode.status || '-'}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-3 rounded-xl border border-white/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-black">{selected ? 'แก้ไขตอนที่เลือก' : 'เพิ่ม/แก้ไขตอน'}</h4>
            <button type="button" disabled={saving} onClick={() => void saveOne()} className="rounded-xl bg-[#e50914] px-3 py-2 text-xs font-black text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save Episode'}</button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Season"><input className={adminInputClassSm} value={form.season_number} onChange={(event) => setValue('season_number', event.target.value)} /></Field>
            <Field label="Episode"><input className={adminInputClassSm} value={form.episode_number} onChange={(event) => setValue('episode_number', event.target.value)} /></Field>
            <Field label="Status"><select className={adminSelectClassSm} value={form.status} onChange={(event) => setValue('status', event.target.value as AdminFrontStatus)}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></Field>
          </div>
          <Field label="Episode Title"><input className={adminInputClassSm} value={form.episode_title} onChange={(event) => setValue('episode_title', event.target.value)} /></Field>
          <Field label="Watch URL"><input className={adminInputClassSm} value={form.watch_url} onChange={(event) => setValue('watch_url', event.target.value)} /></Field>
          <Field label="Trailer URL"><input className={adminInputClassSm} value={form.trailer_url} onChange={(event) => setValue('trailer_url', event.target.value)} /></Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Provider"><input className={adminInputClassSm} value={form.provider} onChange={(event) => setValue('provider', event.target.value)} /></Field>
            <Field label="Notes"><textarea className={`${adminTextareaClass} min-h-20`} value={form.notes} onChange={(event) => setValue('notes', event.target.value)} /></Field>
          </div>
        </div>

        {drafts.length ? (
          <div className="rounded-xl border border-white/10 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-xs font-black">Draft Episodes: {drafts.length}</h4>
              <button type="button" disabled={saving} onClick={() => void saveDrafts()} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-black disabled:opacity-50">Save Bulk</button>
            </div>
            <div className="grid gap-2">
              {drafts.map((draft) => (
                <div key={draft.draft_key} className="grid grid-cols-[70px_1fr] gap-2 text-xs font-bold text-white/60">
                  <span>S{draft.season_number}E{draft.episode_number}</span>
                  <input className={adminInputClassSm} value={draft.watch_url} placeholder="Watch URL" onChange={(event) => setDrafts((current) => current.map((row) => row.draft_key === draft.draft_key ? { ...row, watch_url: event.target.value } : row))} />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
