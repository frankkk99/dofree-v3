'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MovieItem } from '@/lib/tmdb';
import { MovieCard } from '@/components/movie-card';
import { DetailWindow } from '@/components/window-system';
import { canUsePremiumFeature } from '@/lib/premium-access-config';
import { usePremiumAccessSnapshot } from '@/lib/premium-access-client';

type ActorRef = { id?: number; name: string };

type ActorPerson = {
  id: number;
  name: string;
  biography?: string;
  birthday?: string | null;
  deathday?: string | null;
  placeOfBirth?: string | null;
  department?: string;
  profileUrl?: string;
  popularity?: number;
};

type Collaborator = {
  id: number;
  name: string;
  profileUrl?: string;
  role?: string;
  count: number;
  knownFor: string[];
};

type ActorPayload = {
  ok?: boolean;
  person?: ActorPerson;
  works?: MovieItem[];
  collaborators?: Collaborator[];
  error?: string;
};

const emptyPayload: ActorPayload = { works: [], collaborators: [] };

function findActorName(target: EventTarget | null) {
  if (!(target instanceof Element)) return '';
  if (target.closest('[data-actor-profile-window="true"]')) return '';

  let element: Element | null = target;
  for (let i = 0; i < 8 && element; i += 1) {
    const heading = element.querySelector('h4');
    const hasActorShape = element.className?.toString().includes('aspect-[2/3]') || element.getAttribute('data-actor-card') === 'true';
    if (heading?.textContent && hasActorShape) return heading.textContent.trim();
    element = element.parentElement;
  }
  return '';
}

function metaLine(person?: ActorPerson) {
  if (!person) return '';
  const parts = [person.department, person.birthday, person.placeOfBirth].filter(Boolean);
  return parts.join(' · ');
}

function shortBio(person?: ActorPerson) {
  if (!person?.biography) return 'รวมผลงานและนักแสดงที่เคยร่วมงาน สามารถกดต่อไปยังนักแสดงคนอื่นได้เรื่อย ๆ';
  return person.biography;
}

function PersonPoster({ person }: { person?: Pick<ActorPerson | Collaborator, 'name' | 'profileUrl'> }) {
  return (
    <div className="relative aspect-[2/3] overflow-hidden rounded-[24px] bg-white/[0.055] shadow-[0_28px_90px_rgba(0,0,0,0.58)]">
      {person?.profileUrl ? <img src={person.profileUrl} alt={person.name} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_20%,rgba(229,9,20,0.55),#080808_62%)] text-5xl font-black text-white/76">{person?.name?.slice(0, 1) || '?'}</div>}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_25%,rgba(0,0,0,0.88)_100%)]" />
    </div>
  );
}

export function ActorProfileBridge() {
  const [current, setCurrent] = useState<ActorRef | null>(null);
  const [history, setHistory] = useState<ActorRef[]>([]);
  const [payload, setPayload] = useState<ActorPayload>(emptyPayload);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMovie, setSelectedMovie] = useState<MovieItem | null>(null);
  const [upsell, setUpsell] = useState('');
  const { config: premiumAccessConfig, userState: premiumUserState } = usePremiumAccessSnapshot();

  const works = payload.works || [];
  const collaborators = payload.collaborators || [];
  const recommendations = useMemo(() => works.filter((item) => selectedMovie ? `${item.mediaType}-${item.id}` !== `${selectedMovie.mediaType}-${selectedMovie.id}` : true).slice(0, 24), [selectedMovie, works]);

  const openActor = useCallback((next: ActorRef, pushHistory = true) => {
    if (!next.id && !next.name.trim()) return;
    if (!canUsePremiumFeature('actorClick', premiumUserState, premiumAccessConfig)) {
      setUpsell('การดูผลงานจากนักแสดงเป็นฟีเจอร์ Premium');
      window.setTimeout(() => {
        window.location.href = '/membership';
      }, 700);
      return;
    }
    setUpsell('');
    setSelectedMovie(null);
    setCurrent((prev) => {
      if (pushHistory && prev) setHistory((stack) => [...stack.slice(-10), prev]);
      return next;
    });
  }, [premiumAccessConfig, premiumUserState]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const name = findActorName(event.target);
      if (!name) return;
      event.preventDefault();
      event.stopPropagation();
      openActor({ name }, true);
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [openActor]);

  useEffect(() => {
    if (!current) return;
    let active = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (current?.id) params.set('id', String(current.id));
        else params.set('name', current?.name || '');
        const response = await fetch(`/api/tmdb/person?${params.toString()}`, { signal: controller.signal, cache: 'no-store' });
        const data = (await response.json()) as ActorPayload;
        if (!active) return;
        if (!response.ok || data.ok === false) throw new Error(data.error || 'โหลดข้อมูลนักแสดงไม่สำเร็จ');
        setPayload(data);
      } catch (err) {
        if (!active) return;
        setPayload(emptyPayload);
        setError(err instanceof Error ? err.message : 'โหลดข้อมูลนักแสดงไม่สำเร็จ');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [current]);

  function close() {
    setCurrent(null);
    setHistory([]);
    setPayload(emptyPayload);
    setError('');
    setSelectedMovie(null);
  }

  function goBack() {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory((stack) => stack.slice(0, -1));
    openActor(previous, false);
  }

  if (!current) {
    return upsell ? (
      <div className="fixed bottom-24 left-1/2 z-[1200] -translate-x-1/2 rounded-full bg-[#e50914] px-5 py-3 text-xs font-black text-white shadow-[0_18px_70px_rgba(229,9,20,0.45)]">
        {upsell}
      </div>
    ) : null;
  }

  return (
    <>
      <div data-actor-profile-window="true" className="fixed inset-0 z-[140] overflow-y-auto bg-black/68 px-3 py-4 text-white backdrop-blur-[12px] md:px-6 md:py-8" role="dialog" aria-modal="true" onClick={close}>
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(229,9,20,0.26),transparent_24rem),radial-gradient(circle_at_90%_90%,rgba(255,255,255,0.08),transparent_28rem)]" />
        <div onClick={(event) => event.stopPropagation()} className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[34px] bg-white/[0.072] p-3 shadow-[0_42px_160px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-40px_90px_rgba(0,0,0,0.42)] backdrop-blur-3xl md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <div className="flex gap-2">
              {history.length ? <button type="button" onClick={goBack} className="h-10 rounded-full bg-white/[0.08] px-4 text-xs font-black text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] hover:bg-white/[0.13]">ย้อนกลับ</button> : null}
              <span className="inline-flex h-10 items-center rounded-full bg-[#e50914]/18 px-4 text-[10px] font-black uppercase tracking-[0.24em] text-red-100/78">Actor Profile</span>
            </div>
            <button type="button" onClick={close} className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.09] text-2xl font-black text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[#e50914] hover:text-white">×</button>
          </div>

          <section className="grid gap-4 rounded-[30px] bg-black/38 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] md:grid-cols-[220px_1fr] md:p-5">
            <PersonPoster person={payload.person || { name: current.name }} />
            <div className="min-w-0 self-end md:self-center">
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#e50914]">นักแสดง</p>
              <h2 className="mt-2 text-[36px] font-black leading-[0.92] tracking-[-0.075em] md:text-[64px]">{payload.person?.name || current.name}</h2>
              <p className="mt-3 text-xs font-bold text-white/42 md:text-sm">{metaLine(payload.person) || 'ผลงานภาพยนตร์และซีรีส์'}</p>
              <p className="mt-4 line-clamp-4 max-w-3xl text-sm font-medium leading-6 text-white/62 md:text-base md:leading-7">{loading ? 'กำลังโหลดข้อมูลนักแสดง...' : shortBio(payload.person)}</p>
              {error ? <p className="mt-4 rounded-2xl bg-[#e50914]/14 px-4 py-3 text-xs font-bold text-red-100">{error}</p> : null}
            </div>
          </section>

          <section className="mt-4 rounded-[28px] bg-black/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e50914]/80">Works</p>
                <h3 className="mt-1 text-2xl font-black tracking-[-0.05em]">ผลงานของนักแสดง</h3>
              </div>
              <span className="text-xs font-black text-white/35">{works.length} เรื่อง</span>
            </div>
            <div className="movie-rail flex max-w-full gap-2.5 overflow-x-auto overflow-y-hidden pb-2 md:gap-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              {loading ? Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[176px] w-[116px] shrink-0 animate-pulse rounded-[10px] bg-white/[0.055] md:h-[220px] md:w-[146px]" />) : works.map((movie, index) => <MovieCard key={`actor-work-${movie.mediaType}-${movie.id}-${index}`} item={movie} compact onSelect={setSelectedMovie} priorityBadge={index < 3 ? 'ผลงาน' : undefined} />)}
              {!loading && !works.length ? <p className="py-8 text-sm font-bold text-white/42">ยังไม่มีผลงานให้แสดง</p> : null}
            </div>
          </section>

          <section className="mt-4 rounded-[28px] bg-black/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e50914]/80">Collaborators</p>
                <h3 className="mt-1 text-2xl font-black tracking-[-0.05em]">เพื่อนร่วมงาน</h3>
              </div>
              <span className="text-xs font-black text-white/35">กดต่อได้เรื่อย ๆ</span>
            </div>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-3">
              {loading ? Array.from({ length: 6 }).map((_, index) => <div key={index} className="aspect-[2/3] animate-pulse rounded-[16px] bg-white/[0.055]" />) : collaborators.map((person) => (
                <button key={person.id} type="button" data-actor-card="true" onClick={() => openActor({ id: person.id, name: person.name }, true)} className="group relative aspect-[2/3] overflow-hidden rounded-[16px] bg-white/[0.055] text-left shadow-[0_18px_60px_rgba(0,0,0,0.55)] transition hover:scale-[1.015]">
                  <PersonPoster person={person} />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_18%,rgba(0,0,0,0.92)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-2 md:p-3">
                    <h4 className="line-clamp-2 text-[10px] font-black leading-tight text-white md:text-sm">{person.name}</h4>
                    <p className="mt-1 line-clamp-2 text-[8px] font-bold leading-3 text-white/50 md:text-[10px] md:leading-4">{person.knownFor.slice(0, 2).join(' · ')}</p>
                  </div>
                </button>
              ))}
              {!loading && !collaborators.length ? <p className="col-span-full py-5 text-sm font-bold text-white/42">ยังไม่มีเพื่อนร่วมงานให้แสดง</p> : null}
            </div>
          </section>
        </div>
      </div>

      {selectedMovie ? <DetailWindow item={selectedMovie} recommendations={recommendations} onClose={() => setSelectedMovie(null)} onSelect={setSelectedMovie} /> : null}
    </>
  );
}
