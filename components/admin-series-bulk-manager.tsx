'use client';

import { useMemo, useState } from 'react';
import { adminSessionHeaders } from '@/lib/admin-session-browser';
import { adminInputClassSm, adminSelectClassSm, adminTextareaClass } from '@/lib/admin-ui-classes';

type Status = 'draft' | 'review' | 'published' | 'broken' | 'hidden';

type ParsedEpisode = {
  season_number: number;
  episode_number: number;
  episode_title: string;
  watch_url: string;
  trailer_url: string;
  provider: string;
  notes: string;
  status: Status;
  raw: string;
};

type ExistingEpisode = ParsedEpisode & { id?: string };

const cls = adminInputClassSm;
const selectCls = adminSelectClassSm;
const statuses: Status[] = ['published', 'draft', 'review', 'broken', 'hidden'];

function isUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.includes('drive.google.com') || value.includes('iframe') || value.includes('m3u8');
}

function toPositiveInt(value: string, fallback: number) {
  const parsed = Number(String(value || '').replace(/[^0-9]/g, ''));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseLine(line: string, index: number, defaults: { season: number; provider: string; status: Status }) {
  const raw = line.trim();
  if (!raw || raw.startsWith('#')) return null;

  const parts = raw.includes('|') ? raw.split('|').map((part) => part.trim()) : raw.split(/\t+/).map((part) => part.trim());
  let season = defaults.season;
  let episode = index + 1;
  let title = '';
  let watch = '';
  let trailer = '';
  let provider = defaults.provider;
  let status = defaults.status;
  let notes = '';

  const first = parts[0] || '';
  const se = first.match(/^s?(\d+)\s*e(?:p)?\s*(\d+)/i);

  if (se) {
    season = toPositiveInt(se[1], defaults.season);
    episode = toPositiveInt(se[2], index + 1);
    title = parts[1] || '';
    watch = parts[2] || '';
    trailer = parts[3] || '';
    provider = parts[4] || defaults.provider;
    status = (parts[5] as Status) || defaults.status;
    notes = parts.slice(6).join(' | ');
  } else if (parts.length >= 4 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
    season = toPositiveInt(parts[0], defaults.season);
    episode = toPositiveInt(parts[1], index + 1);
    title = parts[2] || '';
    watch = parts[3] || '';
    trailer = parts[4] || '';
    provider = parts[5] || defaults.provider;
    status = (parts[6] as Status) || defaults.status;
    notes = parts.slice(7).join(' | ');
  } else if (parts.length >= 3 && /^\d+$/.test(parts[0])) {
    episode = toPositiveInt(parts[0], index + 1);
    title = parts[1] || '';
    watch = parts[2] || '';
    trailer = parts[3] || '';
    provider = parts[4] || defaults.provider;
    status = (parts[5] as Status) || defaults.status;
    notes = parts.slice(6).join(' | ');
  } else if (parts.length >= 2 && isUrl(parts[1])) {
    episode = index + 1;
    title = parts[0] || '';
    watch = parts[1] || '';
    trailer = parts[2] || '';
    provider = parts[3] || defaults.provider;
    status = (parts[4] as Status) || defaults.status;
    notes = parts.slice(5).join(' | ');
  } else if (parts.length >= 1 && isUrl(parts[0])) {
    episode = index + 1;
    watch = parts[0] || '';
    title = `ตอนที่ ${episode}`;
    trailer = parts[1] || '';
    provider = parts[2] || defaults.provider;
    status = (parts[3] as Status) || defaults.status;
    notes = parts.slice(4).join(' | ');
  } else {
    return null;
  }

  if (!statuses.includes(status)) status = watch ? 'published' : 'draft';
  if (!watch && status === 'published') status = 'draft';

  return {
    season_number: season,
    episode_number: episode,
    episode_title: title,
    watch_url: watch,
    trailer_url: trailer,
    provider,
    notes,
    status,
    raw,
  } satisfies ParsedEpisode;
}

export function AdminSeriesBulkManager() {
  const [tmdbId, setTmdbId] = useState('');
  const [season, setSeason] = useState('1');
  const [provider, setProvider] = useState('bunny');
  const [status, setStatus] = useState<Status>('published');
  const [bulkText, setBulkText] = useState('1 | ตอนที่ 1 | https://example.com/embed/ep1\n2 | ตอนที่ 2 | https://example.com/embed/ep2\n3 | ตอนที่ 3 | https://example.com/embed/ep3');
  const [existing, setExisting] = useState<ExistingEpisode[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const parsed = useMemo(() => {
    const defaults = { season: toPositiveInt(season, 1), provider: provider || 'bunny', status };
    return bulkText.split('\n').map((line, index) => parseLine(line, index, defaults)).filter(Boolean) as ParsedEpisode[];
  }, [bulkText, provider, season, status]);

  async function loadExisting() {
    const id = Number(tmdbId);
    if (!Number.isInteger(id) || id <= 0) {
      setErr('ใส่ TMDB ID ของซีรีส์ก่อน');
      return;
    }

    setLoading(true);
    setErr('');
    setMsg('');
    try {
      const response = await fetch(`/api/admin/series-episodes?tmdbId=${id}`, {
        headers: adminSessionHeaders(),
        cache: 'no-store',
      });
      const data = (await response.json()) as { ok?: boolean; episodes?: ExistingEpisode[]; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || 'โหลดตอนไม่สำเร็จ');
      setExisting(data.episodes || []);
      setMsg(`โหลดตอนเดิม ${data.episodes?.length || 0} ตอน`);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'โหลดตอนไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  async function saveAll() {
    const id = Number(tmdbId);
    if (!Number.isInteger(id) || id <= 0) {
      setErr('ใส่ TMDB ID ของซีรีส์ก่อน');
      return;
    }
    if (!parsed.length) {
      setErr('ยังไม่มีรายการตอนที่อ่านได้');
      return;
    }

    setSaving(true);
    setErr('');
    setMsg(`กำลังบันทึก ${parsed.length} ตอน...`);

    try {
      let saved = 0;
      for (const episode of parsed) {
        const response = await fetch('/api/admin/series-episodes', {
          method: 'POST',
          headers: adminSessionHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify({ tmdb_id: id, ...episode }),
        });
        const data = (await response.json()) as { ok?: boolean; error?: string };
        if (!response.ok || !data.ok) throw new Error(data.error || `บันทึก S${episode.season_number} E${episode.episode_number} ไม่สำเร็จ`);
        saved += 1;
        setMsg(`บันทึกแล้ว ${saved}/${parsed.length} ตอน`);
      }
      await loadExisting();
      setMsg(`บันทึกครบ ${saved} ตอนแล้ว`);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'บันทึกหลายตอนไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 text-white md:px-8">
      <div className="rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(229,9,20,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.62)] md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.30em] text-[#e50914]">Admin Series Tools</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.08em] md:text-6xl">ลงซีรีส์หลายตอนในหน้าเดียว</h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/52">วางรายการหลายบรรทัด แล้วระบบจะบันทึกเป็นตอนของซีรีส์เรื่องเดียวกันอัตโนมัติ เหมาะสำหรับเพิ่ม S1 E1-E16 ในรอบเดียว</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/admin" className="rounded-2xl bg-white/[0.08] px-4 py-3 text-xs font-black text-white/75 hover:bg-white/[0.14]">Dashboard</a>
            <a href="/admin#catalog-manager" className="rounded-2xl bg-white/[0.08] px-4 py-3 text-xs font-black text-white/75 hover:bg-white/[0.14]">Catalog</a>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[180px_120px_160px_150px_auto]">
          <input value={tmdbId} onChange={(event) => setTmdbId(event.target.value)} placeholder="TMDB ID ซีรีส์" inputMode="numeric" className={cls} />
          <input value={season} onChange={(event) => setSeason(event.target.value)} placeholder="Season" inputMode="numeric" className={cls} />
          <input value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="provider" className={cls} />
          <select value={status} onChange={(event) => setStatus(event.target.value as Status)} className={selectCls}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <button type="button" onClick={loadExisting} disabled={loading} className="rounded-xl bg-white/[0.1] px-4 py-2 text-sm font-black text-white/78 disabled:opacity-50">{loading ? 'กำลังโหลด' : 'โหลดตอนเดิม'}</button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.95fr]">
          <div>
            <textarea value={bulkText} onChange={(event) => setBulkText(event.target.value)} rows={18} className={`w-full ${adminTextareaClass}`} />
            <div className="mt-3 rounded-2xl border border-white/8 bg-black/30 p-4 text-xs font-semibold leading-6 text-white/50">
              <p className="font-black text-white/74">รูปแบบที่รองรับ</p>
              <p>1 | ตอนที่ 1 | watch_url</p>
              <p>1 | 1 | ชื่อตอน | watch_url | trailer_url | provider | published | notes</p>
              <p>S1E1 | ชื่อตอน | watch_url | trailer_url | provider | published | notes</p>
              <p>หรือวาง URL อย่างเดียว บรรทัดละตอน ระบบจะไล่เลขตอนให้อัตโนมัติ</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/32 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/34">Preview</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.05em]">อ่านได้ {parsed.length} ตอน</h2>
              </div>
              <button type="button" onClick={saveAll} disabled={saving || !parsed.length} className="rounded-xl bg-[#e50914] px-4 py-2 text-sm font-black text-white shadow-glow disabled:opacity-50">{saving ? 'กำลังบันทึก' : 'บันทึกทุกตอน'}</button>
            </div>

            {(msg || err) ? <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-black ${err ? 'bg-[#e50914]/15 text-red-100' : 'bg-emerald-400/10 text-emerald-100'}`}>{err || msg}</div> : null}

            <div className="mt-4 max-h-[420px] overflow-y-auto rounded-xl border border-white/8">
              {parsed.length ? parsed.map((episode) => (
                <div key={`${episode.season_number}-${episode.episode_number}-${episode.raw}`} className="grid gap-1 border-b border-white/8 p-3 text-xs last:border-b-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-white">S{episode.season_number} E{episode.episode_number} {episode.episode_title || `ตอนที่ ${episode.episode_number}`}</span>
                    <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-black text-white/56">{episode.status}</span>
                  </div>
                  <p className="truncate text-white/42">{episode.watch_url || 'ยังไม่มี watch_url'}</p>
                </div>
              )) : <p className="p-4 text-sm font-bold text-white/38">ยังอ่านรายการตอนไม่ได้</p>}
            </div>
          </div>
        </div>

        {existing.length ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/34">Existing Episodes</p>
            <div className="mt-3 flex max-h-36 flex-wrap gap-2 overflow-y-auto">
              {existing.map((episode) => <span key={`${episode.season_number}-${episode.episode_number}`} className="rounded-full bg-black/38 px-3 py-1.5 text-[11px] font-black text-white/62">S{episode.season_number} E{episode.episode_number} {episode.episode_title || ''}</span>)}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
