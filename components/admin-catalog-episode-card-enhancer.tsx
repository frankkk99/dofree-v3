'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { adminSessionHeaders } from '@/lib/admin-session-browser';

type Status = 'draft' | 'review' | 'published' | 'broken' | 'hidden';

type Episode = {
  id?: string;
  season_number: number;
  episode_number: number;
  episode_title?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  notes?: string | null;
  status?: Status;
};

type EpisodeCard = {
  key: string;
  season_number: string;
  episode_number: string;
  episode_title: string;
  watch_url: string;
  trailer_url: string;
  provider: string;
  notes: string;
  status: Status;
};

const statuses: Status[] = ['published', 'draft', 'review', 'broken', 'hidden'];
const inputClass = 'w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-white outline-none placeholder:text-white/32 focus:border-[#e50914]';

function makeKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function blankEpisode(index: number, provider = 'bunny', season = '1'): EpisodeCard {
  return {
    key: makeKey(),
    season_number: season,
    episode_number: String(index + 1),
    episode_title: `ตอนที่ ${index + 1}`,
    watch_url: '',
    trailer_url: '',
    provider,
    notes: '',
    status: 'published',
  };
}

function episodeToCard(episode: Episode): EpisodeCard {
  return {
    key: episode.id || `${episode.season_number}-${episode.episode_number}-${makeKey()}`,
    season_number: String(episode.season_number || 1),
    episode_number: String(episode.episode_number || 1),
    episode_title: episode.episode_title || `ตอนที่ ${episode.episode_number || 1}`,
    watch_url: episode.watch_url || '',
    trailer_url: episode.trailer_url || '',
    provider: episode.provider || 'bunny',
    notes: episode.notes || '',
    status: episode.status || 'published',
  };
}

function extractTmdbId() {
  const modal = Array.from(document.querySelectorAll('div.fixed')).find((node) => node.textContent?.includes('TMDB'));
  const match = modal?.textContent?.match(/TMDB\s+(\d+)/i);
  return match?.[1] || '';
}

function findEpisodeSection() {
  return Array.from(document.querySelectorAll('section')).find((node) => node.textContent?.includes('Series Episodes') && node.textContent?.includes('จัดการซีซัน')) as HTMLElement | undefined;
}

function prepareSection(section: HTMLElement) {
  const children = Array.from(section.children) as HTMLElement[];
  children.slice(2).forEach((child) => {
    if (!child.hasAttribute('data-inline-episode-cards')) child.style.display = 'none';
  });
  let root = section.querySelector('[data-inline-episode-cards="true"]') as HTMLElement | null;
  if (!root) {
    root = document.createElement('div');
    root.dataset.inlineEpisodeCards = 'true';
    section.appendChild(root);
  }
  return root;
}

function EpisodeCardsPanel({ target, tmdbId }: { target: HTMLElement; tmdbId: string }) {
  const [cards, setCards] = useState<EpisodeCard[]>(() => [blankEpisode(0), blankEpisode(1), blankEpisode(2)]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const validCards = useMemo(() => cards.filter((card) => card.watch_url.trim() || card.status !== 'published'), [cards]);

  function updateCard(key: string, patch: Partial<EpisodeCard>) {
    setCards((current) => current.map((card) => card.key === key ? { ...card, ...patch } : card));
  }

  function addCard() {
    setCards((current) => [...current, blankEpisode(current.length, current[current.length - 1]?.provider || 'bunny', current[current.length - 1]?.season_number || '1')]);
  }

  function removeCard(key: string) {
    setCards((current) => current.length <= 1 ? current : current.filter((card) => card.key !== key));
  }

  async function loadEpisodes() {
    const id = Number(tmdbId);
    if (!Number.isInteger(id) || id <= 0) {
      setError('ไม่พบ TMDB ID ของซีรีส์');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/series-episodes?tmdbId=${id}`, {
        headers: adminSessionHeaders(),
        cache: 'no-store',
      });
      const data = (await response.json()) as { ok?: boolean; episodes?: Episode[]; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || 'โหลดตอนไม่สำเร็จ');
      const next = (data.episodes || []).map(episodeToCard);
      setCards(next.length ? next : [blankEpisode(0), blankEpisode(1), blankEpisode(2)]);
      setMessage(next.length ? `โหลดตอนเดิม ${next.length} ตอน` : 'ยังไม่มีตอนเดิม เริ่มเพิ่มได้เลย');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดตอนไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  async function saveAll() {
    const id = Number(tmdbId);
    if (!Number.isInteger(id) || id <= 0) {
      setError('ไม่พบ TMDB ID ของซีรีส์');
      return;
    }
    if (!validCards.length) {
      setError('ยังไม่มีตอนที่พร้อมบันทึก');
      return;
    }

    setSaving(true);
    setError('');
    setMessage(`กำลังบันทึก ${validCards.length} ตอน...`);
    try {
      let saved = 0;
      for (const card of validCards) {
        const response = await fetch('/api/admin/series-episodes', {
          method: 'POST',
          headers: adminSessionHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify({
            tmdb_id: id,
            season_number: Number(card.season_number),
            episode_number: Number(card.episode_number),
            episode_title: card.episode_title,
            watch_url: card.watch_url,
            trailer_url: card.trailer_url,
            provider: card.provider,
            notes: card.notes,
            status: card.watch_url.trim() ? card.status : 'draft',
          }),
        });
        const data = (await response.json()) as { ok?: boolean; error?: string };
        if (!response.ok || !data.ok) throw new Error(data.error || `บันทึก S${card.season_number} E${card.episode_number} ไม่สำเร็จ`);
        saved += 1;
        setMessage(`บันทึกแล้ว ${saved}/${validCards.length} ตอน`);
      }
      setMessage(`บันทึกครบ ${saved} ตอนแล้ว`);
      await loadEpisodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกหลายตอนไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadEpisodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmdbId]);

  return createPortal(
    <div className="mt-4 rounded-2xl border border-[#e50914]/20 bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#e50914]">Multi Episode Cards</p>
          <h4 className="mt-1 text-lg font-black tracking-[-0.04em]">เพิ่มหลายตอนในการ์ดเดียว</h4>
          <p className="mt-1 text-xs font-bold text-white/40">แสดง 3 ใบต่อแถว กดเพิ่มตอนแล้วจะต่อยาวลงมาเรื่อย ๆ</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={addCard} className="rounded-xl bg-white/[0.1] px-3 py-2 text-xs font-black text-white/75 hover:bg-white/[0.16]">+ เพิ่มตอน</button>
          <button type="button" onClick={loadEpisodes} disabled={loading} className="rounded-xl bg-white/[0.1] px-3 py-2 text-xs font-black text-white/75 disabled:opacity-50">{loading ? 'กำลังโหลด' : 'โหลดตอนเดิม'}</button>
          <button type="button" onClick={saveAll} disabled={saving} className="rounded-xl bg-[#e50914] px-4 py-2 text-xs font-black text-white shadow-glow disabled:opacity-50">{saving ? 'กำลังบันทึก' : `บันทึก ${validCards.length} ตอน`}</button>
        </div>
      </div>

      {(message || error) ? <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-black ${error ? 'bg-[#e50914]/15 text-red-100' : 'bg-emerald-400/10 text-emerald-100'}`}>{error || message}</div> : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {cards.map((card, index) => (
          <article key={card.key} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-black text-white/70">ใบที่ {index + 1}</p>
              <button type="button" onClick={() => removeCard(card.key)} className="rounded-lg bg-white/[0.08] px-2 py-1 text-[10px] font-black text-white/45 hover:text-white">ลบ</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={card.season_number} onChange={(event) => updateCard(card.key, { season_number: event.target.value })} placeholder="Season" inputMode="numeric" className={inputClass} />
              <input value={card.episode_number} onChange={(event) => updateCard(card.key, { episode_number: event.target.value })} placeholder="Episode" inputMode="numeric" className={inputClass} />
            </div>
            <input value={card.episode_title} onChange={(event) => updateCard(card.key, { episode_title: event.target.value })} placeholder="ชื่อตอน เช่น ตอนที่ 1" className={`${inputClass} mt-2`} />
            <input value={card.watch_url} onChange={(event) => updateCard(card.key, { watch_url: event.target.value, status: event.target.value.trim() ? card.status : 'draft' })} placeholder="Episode Watch URL" className={`${inputClass} mt-2`} />
            <input value={card.trailer_url} onChange={(event) => updateCard(card.key, { trailer_url: event.target.value })} placeholder="Episode Trailer URL" className={`${inputClass} mt-2`} />
            <div className="mt-2 grid grid-cols-[1fr_120px] gap-2">
              <input value={card.provider} onChange={(event) => updateCard(card.key, { provider: event.target.value })} placeholder="provider" className={inputClass} />
              <select value={card.status} onChange={(event) => updateCard(card.key, { status: event.target.value as Status })} className={inputClass}>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select>
            </div>
            <input value={card.notes} onChange={(event) => updateCard(card.key, { notes: event.target.value })} placeholder="หมายเหตุของตอนนี้" className={`${inputClass} mt-2`} />
          </article>
        ))}
      </div>
    </div>,
    target,
  );
}

export function AdminCatalogEpisodeCardEnhancer() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [tmdbId, setTmdbId] = useState('');

  useEffect(() => {
    function sync() {
      const section = findEpisodeSection();
      const id = extractTmdbId();
      if (!section || !id) {
        setTarget(null);
        setTmdbId('');
        return;
      }
      setTarget(prepareSection(section));
      setTmdbId(id);
    }

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (!target || !tmdbId) return null;
  return <EpisodeCardsPanel target={target} tmdbId={tmdbId} />;
}
