// @ts-nocheck
'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminSessionHeaders } from '@/lib/admin-session-browser';
import { adminInputClass, adminSelectClass } from '@/lib/admin-ui-classes';

type AdminSeriesCard = {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  title_en?: string | null;
  poster_url?: string | null;
  rating?: number | string | null;
  release_year?: string | null;
};

type EpisodeRow = {
  id?: string;
  tmdb_id: number;
  season_number: number;
  episode_number: number;
  episode_title?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  notes?: string | null;
  status?: 'draft' | 'review' | 'published' | 'broken' | 'hidden';
  is_active?: boolean;
};

type EpisodePayload = { ok?: boolean; episodes?: EpisodeRow[]; error?: string; saved?: number };

type Props = {
  card: AdminSeriesCard | null;
  onClose: () => void;
  onSaved?: () => void;
  setMessage?: (value: string) => void;
};

const input = adminInputClass;
const selectInput = adminSelectClass;
const ghostBtn = 'rounded-xl bg-white/[0.08] px-3 py-2 text-[10px] font-black text-white/70 hover:bg-white/[0.14] disabled:opacity-45';
const redBtn = 'rounded-xl bg-[#e50914] px-3 py-2 text-[10px] font-black text-white shadow-glow disabled:opacity-45';
const statusOptions = [
  { value: 'published', label: 'เผยแพร่' },
  { value: 'draft', label: 'แบบร่าง' },
  { value: 'review', label: 'รอตรวจ' },
  { value: 'broken', label: 'ลิงก์เสีย' },
  { value: 'hidden', label: 'ซ่อน' },
];

function normalizedEpisode(row: Partial<EpisodeRow>, fallbackTmdbId: number, index = 0): EpisodeRow {
  const season = Number(row.season_number || 1);
  const episode = Number(row.episode_number || index + 1);
  const watchUrl = String(row.watch_url || '').trim();
  const requestedStatus = (row.status || (watchUrl ? 'published' : 'draft')) as EpisodeRow['status'];
  return {
    ...row,
    tmdb_id: Number(row.tmdb_id || fallbackTmdbId),
    season_number: Number.isInteger(season) && season > 0 ? season : 1,
    episode_number: Number.isInteger(episode) && episode > 0 ? episode : index + 1,
    episode_title: String(row.episode_title || '').trim(),
    watch_url: watchUrl,
    trailer_url: String(row.trailer_url || '').trim(),
    provider: String(row.provider || 'admin').trim() || 'admin',
    notes: String(row.notes || '').trim(),
    status: requestedStatus === 'published' && !watchUrl ? 'draft' : requestedStatus,
    is_active: requestedStatus !== 'hidden',
  };
}

function parseBulkLines(text: string, tmdbId: number, startEpisode = 1, seasonNumber = 1) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.map((line, index) => {
    const url = line.match(/https?:\/\/\S+/)?.[0] || '';
    const episodeMatch = line.match(/(?:^|\s)(?:s(\d+)\s*)?(?:e|ep|ตอนที่|ตอน)?\s*(\d+)/i);
    const epNumber = episodeMatch?.[2] ? Number(episodeMatch[2]) : startEpisode + index;
    const ssNumber = episodeMatch?.[1] ? Number(episodeMatch[1]) : seasonNumber;
    const title = line
      .replace(url, '')
      .replace(/(?:^|\s)(?:s\d+\s*)?(?:e|ep|ตอนที่|ตอน)?\s*\d+/i, '')
      .replace(/[|,-]+$/g, '')
      .trim();
    return normalizedEpisode({
      tmdb_id: tmdbId,
      season_number: ssNumber,
      episode_number: epNumber,
      episode_title: title,
      watch_url: url,
      status: url ? 'published' : 'draft',
      provider: 'admin',
    }, tmdbId, index);
  });
}

function episodeKey(row: EpisodeRow, index: number) {
  return row.id || `${row.season_number}-${row.episode_number}-${index}`;
}

export function AdminSeriesEpisodeEditor({ card, onClose, onSaved, setMessage }: Props) {
  const [episodes, setEpisodes] = useState<EpisodeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [localMessage, setLocalMessage] = useState('');

  const open = Boolean(card?.media_type === 'tv');
  const publishedCount = useMemo(() => episodes.filter((episode) => episode.status === 'published' && episode.watch_url).length, [episodes]);
  const seasonOptions = useMemo(() => [...new Set(episodes.map((episode) => Number(episode.season_number || 1)))].sort((a, b) => a - b), [episodes]);

  async function loadEpisodes() {
    if (!card) return;
    setLoading(true);
    setLocalMessage('');
    try {
      const response = await fetch(`/api/admin/series-episodes?tmdbId=${card.tmdb_id}`, { headers: adminSessionHeaders(), cache: 'no-store' });
      const payload = await response.json() as EpisodePayload;
      if (!payload.ok) throw new Error(payload.error || 'โหลดตอนไม่สำเร็จ');
      setEpisodes((payload.episodes || []).map((row, index) => normalizedEpisode(row, card.tmdb_id, index)));
    } catch (error) {
      const text = error instanceof Error ? error.message : 'โหลดตอนไม่สำเร็จ';
      setLocalMessage(text);
      setMessage?.(text);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) void loadEpisodes();
    else {
      setEpisodes([]);
      setBulkText('');
      setLocalMessage('');
    }
  }, [card?.tmdb_id, open]);

  function patchEpisode(index: number, patch: Partial<EpisodeRow>) {
    if (!card) return;
    setEpisodes((current) => current.map((row, rowIndex) => rowIndex === index ? normalizedEpisode({ ...row, ...patch }, card.tmdb_id, rowIndex) : row));
  }

  function addEpisode() {
    if (!card) return;
    const last = episodes[episodes.length - 1];
    const next = normalizedEpisode({
      tmdb_id: card.tmdb_id,
      season_number: last?.season_number || 1,
      episode_number: last ? Number(last.episode_number || 0) + 1 : 1,
      status: 'draft',
      provider: 'admin',
    }, card.tmdb_id, episodes.length);
    setEpisodes((current) => [...current, next]);
  }

  function applyBulkPaste() {
    if (!card) return;
    const last = episodes[episodes.length - 1];
    const parsed = parseBulkLines(bulkText, card.tmdb_id, last ? Number(last.episode_number || 0) + 1 : 1, last?.season_number || 1);
    if (!parsed.length) {
      setLocalMessage('ยังไม่มีลิงก์หรือข้อความตอนให้เพิ่ม');
      return;
    }
    setEpisodes((current) => [...current, ...parsed]);
    setBulkText('');
    setLocalMessage(`เพิ่มจากข้อความ ${parsed.length} ตอนแล้ว`);
  }

  async function saveEpisodes() {
    if (!card) return;
    const validRows = episodes
      .map((row, index) => normalizedEpisode(row, card.tmdb_id, index))
      .filter((row) => Number(row.episode_number) > 0 && (row.watch_url || row.episode_title || row.status === 'hidden'));
    if (!validRows.length) {
      setLocalMessage('ยังไม่มีตอนให้บันทึก');
      return;
    }
    setSaving(true);
    setLocalMessage('');
    try {
      const response = await fetch('/api/admin/series-episodes', {
        method: 'POST',
        headers: adminSessionHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({ tmdb_id: card.tmdb_id, episodes: validRows }),
      });
      const payload = await response.json() as EpisodePayload;
      if (!payload.ok) throw new Error(payload.error || 'บันทึกตอนไม่สำเร็จ');
      setMessage?.(`บันทึกตอนซีรีส์แล้ว ${payload.saved || validRows.length} ตอน`);
      setLocalMessage(`บันทึกแล้ว ${payload.saved || validRows.length} ตอน`);
      await loadEpisodes();
      onSaved?.();
    } catch (error) {
      const text = error instanceof Error ? error.message : 'บันทึกตอนไม่สำเร็จ';
      setLocalMessage(text);
      setMessage?.(text);
    } finally {
      setSaving(false);
    }
  }

  if (!open || !card) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/72 p-3 backdrop-blur-sm md:p-6" onClick={onClose}>
      <section className="mx-auto flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#070707]/96 shadow-[0_40px_130px_rgba(0,0,0,0.88)] backdrop-blur-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-4 md:p-5">
          <div className="flex min-w-0 gap-3">
            <div className="h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-white/[0.06]">{card.poster_url ? <img src={card.poster_url} alt="" className="h-full w-full object-cover" /> : null}</div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e50914]">Series Episodes</p>
              <h2 className="mt-1 line-clamp-2 text-2xl font-black tracking-[-0.05em] text-white md:text-3xl">จัดการตอนซีรีส์</h2>
              <p className="mt-1 line-clamp-1 text-xs font-bold text-white/45">{card.title_en || card.title} · ID {card.tmdb_id}</p>
              <p className="mt-2 text-[10px] font-black text-white/35">ทั้งหมด {episodes.length} ตอน · เผยแพร่ {publishedCount} ตอน{seasonOptions.length ? ` · ${seasonOptions.length} ซีซัน` : ''}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={ghostBtn} onClick={() => void loadEpisodes()} disabled={loading || saving}>Reload</button>
            <button className={redBtn} onClick={() => void saveEpisodes()} disabled={saving || loading}>{saving ? 'กำลังบันทึก...' : 'บันทึกตอน'}</button>
            <button className={ghostBtn} onClick={onClose}>ปิด</button>
          </div>
        </header>

        {localMessage ? <div className="mx-4 mt-3 rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-xs font-bold text-white/70 md:mx-5">{localMessage}</div> : null}

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-[1fr_340px] md:p-5">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h3 className="text-lg font-black">รายการตอน</h3><p className="text-[10px] font-bold text-white/38">ซีรีส์จะพร้อมดูเมื่อมีตอนที่เผยแพร่และมีลิงก์รับชม</p></div>
              <button className={ghostBtn} onClick={addEpisode}>+ เพิ่มตอน</button>
            </div>

            {loading ? <div className="rounded-2xl bg-white/[0.04] p-5 text-center text-xs font-black text-white/42">กำลังโหลดตอน...</div> : null}
            {!loading && !episodes.length ? <div className="rounded-2xl bg-white/[0.04] p-5 text-center text-xs font-black text-white/42">ยังไม่มีตอน กดเพิ่มตอนหรือวางหลายลิงก์ด้านขวา</div> : null}

            {episodes.map((episode, index) => (
              <article key={episodeKey(episode, index)} className={`rounded-2xl border p-3 ${episode.status === 'published' && episode.watch_url ? 'border-emerald-400/20 bg-emerald-400/[0.045]' : episode.status === 'hidden' ? 'border-white/8 bg-white/[0.025] opacity-70' : 'border-white/8 bg-white/[0.04]'}`}>
                <div className="grid gap-2 md:grid-cols-[74px_74px_minmax(0,1fr)_140px]">
                  <input className={input} type="number" min={1} value={episode.season_number} onChange={(event) => patchEpisode(index, { season_number: Number(event.target.value) })} placeholder="ซีซัน" />
                  <input className={input} type="number" min={1} value={episode.episode_number} onChange={(event) => patchEpisode(index, { episode_number: Number(event.target.value) })} placeholder="ตอน" />
                  <input className={input} value={episode.episode_title || ''} onChange={(event) => patchEpisode(index, { episode_title: event.target.value })} placeholder="ชื่อตอน เช่น Pilot" />
                  <select className={selectInput} value={episode.status || 'draft'} onChange={(event) => patchEpisode(index, { status: event.target.value as EpisodeRow['status'] })}>
                    {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_160px]">
                  <input className={input} value={episode.watch_url || ''} onChange={(event) => patchEpisode(index, { watch_url: event.target.value })} placeholder="ลิงก์รับชมตอนนี้" />
                  <input className={input} value={episode.provider || 'admin'} onChange={(event) => patchEpisode(index, { provider: event.target.value })} placeholder="แหล่งลิงก์" />
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                  <input className={input} value={episode.notes || ''} onChange={(event) => patchEpisode(index, { notes: event.target.value })} placeholder="หมายเหตุ เช่น ซับไทย / พากย์ไทย / สำรอง" />
                  <button className={ghostBtn} onClick={() => patchEpisode(index, { status: 'hidden', is_active: false })}>ซ่อนตอน</button>
                </div>
              </article>
            ))}
          </div>

          <aside className="rounded-2xl border border-white/8 bg-black/35 p-3 md:p-4">
            <h3 className="text-lg font-black">วางหลายลิงก์</h3>
            <p className="mt-1 text-[10px] font-bold leading-4 text-white/38">วางทีละบรรทัด ระบบจะเรียงเป็นตอนถัดไปให้เอง หรือใส่รูปแบบ EP1 / S1E1 ได้</p>
            <textarea className={`${input} mt-3 min-h-[220px] resize-y leading-5`} value={bulkText} onChange={(event) => setBulkText(event.target.value)} placeholder={`https://link-ep1\nhttps://link-ep2\nS1E3 ชื่อตอน https://link-ep3`} />
            <button className={`${redBtn} mt-3 w-full`} onClick={applyBulkPaste}>เพิ่มจากข้อความ</button>
            <div className="mt-4 rounded-2xl bg-white/[0.04] p-3 text-[10px] font-bold leading-5 text-white/42">
              <p className="font-black text-white/62">หลักการใช้งาน</p>
              <p>1. ซีรีส์ต้องใส่ลิงก์เป็นตอน</p>
              <p>2. ตอนที่ไม่มีลิงก์จะเป็นแบบร่าง</p>
              <p>3. ตอนที่เผยแพร่ + มีลิงก์ จะไปแสดงหน้าบ้าน</p>
              <p>4. ถ้าซ่อนตอน จะไม่แสดงให้ผู้ชม</p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
