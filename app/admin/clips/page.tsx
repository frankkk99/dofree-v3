'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AdminAuthGuard } from '@/components/admin-auth-guard';
import {
  mediaClipLanguages,
  mediaClipSpoilerLevels,
  mediaClipStatuses,
  mediaClipTypes,
  type MediaClipLanguage,
  type MediaClipRow,
  type MediaClipSpoilerLevel,
  type MediaClipStatus,
  type MediaClipType,
} from '@/lib/media-clips';
import type { MediaType } from '@/lib/tmdb';
import { getValidSession } from '@/lib/supabase-auth-browser';
import { parseYouTubeUrl } from '@/lib/youtube-url';

type ClipFormState = {
  title: string;
  description: string;
  youtubeUrl: string;
  clipType: MediaClipType;
  spoilerLevel: MediaClipSpoilerLevel;
  language: MediaClipLanguage;
  mediaType: '' | MediaType;
  tmdbId: string;
  mediaTitle: string;
  mediaSlug: string;
  posterUrl: string;
  genres: string;
  status: MediaClipStatus;
  showHome: boolean;
  showClips: boolean;
  sortOrder: string;
};

type ClipsResponse = {
  ok?: boolean;
  clips?: MediaClipRow[];
  clip?: MediaClipRow | null;
  error?: string;
};

type MediaSearchItem = {
  id: number;
  mediaType: MediaType;
  title: string;
  titleEn?: string;
  year?: string;
  posterUrl?: string;
  backdropUrl?: string;
  rating?: number;
  voteCount?: number;
  genres?: string[];
  language?: string;
};

type MediaSearchResponse = {
  ok?: boolean;
  results?: MediaSearchItem[];
  error?: string;
};

const emptyForm: ClipFormState = {
  title: '',
  description: '',
  youtubeUrl: '',
  clipType: 'shorts',
  spoilerLevel: 'none',
  language: 'thai',
  mediaType: '',
  tmdbId: '',
  mediaTitle: '',
  mediaSlug: '',
  posterUrl: '',
  genres: '',
  status: 'draft',
  showHome: false,
  showClips: true,
  sortOrder: '0',
};

const clipTypeLabels: Record<MediaClipType, string> = {
  shorts: 'Shorts',
  trailer: 'ตัวอย่าง',
  summary: 'สรุปหนัง',
  spoiler: 'สปอย',
  scene: 'ฉากเด็ด',
  review: 'รีวิวสั้น',
};

const spoilerLabels: Record<MediaClipSpoilerLevel, string> = {
  none: 'ไม่มีสปอย',
  light: 'สปอยเล็กน้อย',
  heavy: 'สปอยหนัก',
};

const languageLabels: Record<MediaClipLanguage, string> = {
  thai_dub: 'พากย์ไทย',
  thai_sub: 'ซับไทย',
  thai: 'ไทย',
  english: 'อังกฤษ',
  other: 'อื่น ๆ',
};

const statusLabels: Record<MediaClipStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  hidden: 'Hidden',
};

function formFromClip(clip: MediaClipRow): ClipFormState {
  return {
    title: clip.title || '',
    description: clip.description || '',
    youtubeUrl: clip.youtube_url || '',
    clipType: clip.clip_type,
    spoilerLevel: clip.spoiler_level,
    language: clip.language,
    mediaType: clip.media_type || '',
    tmdbId: clip.tmdb_id ? String(clip.tmdb_id) : '',
    mediaTitle: clip.media_title || '',
    mediaSlug: clip.media_slug || '',
    posterUrl: clip.poster_url || '',
    genres: Array.isArray(clip.genres) ? clip.genres.join(', ') : '',
    status: clip.status,
    showHome: clip.show_home,
    showClips: clip.show_clips,
    sortOrder: String(clip.sort_order ?? 0),
  };
}

function apiBody(form: ClipFormState) {
  return {
    title: form.title,
    description: form.description,
    youtubeUrl: form.youtubeUrl,
    clipType: form.clipType,
    spoilerLevel: form.spoilerLevel,
    language: form.language,
    mediaType: form.mediaType || undefined,
    tmdbId: form.tmdbId || undefined,
    mediaTitle: form.mediaTitle,
    mediaSlug: form.mediaSlug,
    posterUrl: form.posterUrl,
    genres: form.genres.split(',').map((item) => item.trim()).filter(Boolean),
    status: form.status,
    showHome: form.showHome,
    showClips: form.showClips,
    sortOrder: form.sortOrder || '0',
  };
}

function fieldClass() {
  return 'h-11 w-full rounded-2xl border border-white/10 bg-black/30 px-3 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-[#e50914]/70 focus:ring-2 focus:ring-[#e50914]/20';
}

function areaClass() {
  return 'min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#e50914]/70 focus:ring-2 focus:ring-[#e50914]/20';
}

function badgeClass(status: MediaClipStatus) {
  if (status === 'published') return 'bg-emerald-400/14 text-emerald-100 ring-emerald-300/20';
  if (status === 'hidden') return 'bg-zinc-400/12 text-zinc-200 ring-white/10';
  return 'bg-amber-300/14 text-amber-100 ring-amber-300/20';
}

export default function AdminClipsPage() {
  const [form, setForm] = useState<ClipFormState>(emptyForm);
  const [clips, setClips] = useState<MediaClipRow[]>([]);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [mediaQuery, setMediaQuery] = useState('');
  const [mediaResults, setMediaResults] = useState<MediaSearchItem[]>([]);
  const [mediaSearching, setMediaSearching] = useState(false);

  const parsedPreview = useMemo(() => parseYouTubeUrl(form.youtubeUrl), [form.youtubeUrl]);

  async function authToken() {
    const session = await getValidSession();
    if (!session?.access_token) throw new Error('ต้องเข้าสู่ระบบแอดมินใหม่');
    return session.access_token;
  }

  async function loadClips() {
    setLoading(true);
    setMessage('');
    try {
      const token = await authToken();
      const response = await fetch('/api/admin/clips?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = await response.json() as ClipsResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลดรายการคลิปไม่ได้');
      setClips(payload.clips || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดรายการคลิปไม่ได้');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update<K extends keyof ClipFormState>(key: K, value: ClipFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId('');
  }

  function editClip(clip: MediaClipRow) {
    setForm(formFromClip(clip));
    setEditingId(clip.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function searchMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = mediaQuery.trim();
    if (query.length < 2) {
      setMediaResults([]);
      setMessage('พิมพ์ชื่อหนังอย่างน้อย 2 ตัวอักษร');
      return;
    }

    setMediaSearching(true);
    setMessage('');
    try {
      const response = await fetch(`/api/media-search?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
      const payload = await response.json() as MediaSearchResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'ค้นหาหนังไม่ได้');
      setMediaResults(payload.results || []);
    } catch (error) {
      setMediaResults([]);
      setMessage(error instanceof Error ? error.message : 'ค้นหาหนังไม่ได้');
    } finally {
      setMediaSearching(false);
    }
  }

  function selectMedia(item: MediaSearchItem) {
    setForm((current) => ({
      ...current,
      title: current.title || `${item.title} - คลิปสั้นก่อนดู`,
      mediaType: item.mediaType,
      tmdbId: String(item.id),
      mediaTitle: item.title,
      posterUrl: item.posterUrl || current.posterUrl,
      genres: item.genres?.length ? item.genres.join(', ') : current.genres,
    }));
    setMediaResults([]);
    setMediaQuery(item.title);
    setMessage(`เลือกเรื่อง ${item.title} แล้ว`);
  }

  async function saveClip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      if (!parsedPreview) throw new Error('YouTube URL ไม่ถูกต้อง');
      const token = await authToken();
      const endpoint = editingId ? `/api/admin/clips?id=${encodeURIComponent(editingId)}` : '/api/admin/clips';
      const response = await fetch(endpoint, {
        method: editingId ? 'PATCH' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: editingId || undefined, ...apiBody(form) }),
      });
      const payload = await response.json() as ClipsResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'บันทึกคลิปไม่ได้');
      setMessage(editingId ? 'แก้ไขคลิปแล้ว' : 'เพิ่มคลิปแล้ว');
      resetForm();
      await loadClips();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกคลิปไม่ได้');
    } finally {
      setSaving(false);
    }
  }

  async function quickPatch(clip: MediaClipRow, patch: Partial<ClipFormState>) {
    setMessage('');
    try {
      const token = await authToken();
      const next = { ...formFromClip(clip), ...patch };
      const response = await fetch(`/api/admin/clips?id=${encodeURIComponent(clip.id)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: clip.id, ...apiBody(next) }),
      });
      const payload = await response.json() as ClipsResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'อัปเดตคลิปไม่ได้');
      await loadClips();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'อัปเดตคลิปไม่ได้');
    }
  }

  async function deleteClip(clip: MediaClipRow) {
    if (!window.confirm(`ลบคลิป “${clip.title}” ใช่ไหม?`)) return;
    setMessage('');
    try {
      const token = await authToken();
      const response = await fetch(`/api/admin/clips?id=${encodeURIComponent(clip.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json() as ClipsResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'ลบคลิปไม่ได้');
      if (editingId === clip.id) resetForm();
      await loadClips();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ลบคลิปไม่ได้');
    }
  }

  return (
    <AdminAuthGuard>
      <main className="min-h-screen bg-[#050505] px-4 py-5 text-white md:px-8 md:py-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <section className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(229,9,20,0.24),transparent_24rem),rgba(255,255,255,0.04)] p-5 shadow-[0_30px_110px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.08)] md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ff3b45]">Clips Manager</p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.055em] md:text-5xl">จัดการคลิปสั้น / สปอย</h1>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/58 md:text-base">วาง YouTube URL, ผูกกับหนัง, เลือกประเภท แล้วเปิดแสดงบนหน้า Clips หรือหน้าแรกได้</p>
              </div>
              <div className="flex gap-2">
                <a href="/admin" className="inline-flex h-11 items-center rounded-2xl bg-white/[0.10] px-5 text-xs font-black text-white/76 ring-1 ring-white/10 hover:bg-white/[0.16] hover:text-white">กลับแอดมิน</a>
                <a href="/clips" className="inline-flex h-11 items-center rounded-2xl bg-[#e50914] px-5 text-xs font-black text-white shadow-[0_14px_34px_rgba(229,9,20,0.28)]">ดูหน้าบ้าน</a>
              </div>
            </div>
          </section>

          {message ? <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-white/78">{message}</div> : null}

          <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <form onSubmit={saveClip} className="rounded-[26px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_22px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.06)] md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#ff3b45]">{editingId ? 'Edit Clip' : 'New Clip'}</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">{editingId ? 'แก้ไขคลิป' : 'เพิ่มคลิปใหม่'}</h2>
                </div>
                {editingId ? <button type="button" onClick={resetForm} className="rounded-2xl bg-white/[0.08] px-4 py-2 text-xs font-black text-white/68 ring-1 ring-white/10">ยกเลิก</button> : null}
              </div>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-1.5 text-xs font-black text-white/58">YouTube URL
                  <input value={form.youtubeUrl} onChange={(event) => update('youtubeUrl', event.target.value)} required placeholder="วางลิงก์ watch / shorts / youtu.be / embed" className={fieldClass()} />
                </label>
                <label className="grid gap-1.5 text-xs font-black text-white/58">ชื่อคลิป
                  <input value={form.title} onChange={(event) => update('title', event.target.value)} required placeholder="เช่น สรุปเร็ว 30 วิ ก่อนดูเรื่องนี้" className={fieldClass()} />
                </label>
                <label className="grid gap-1.5 text-xs font-black text-white/58">คำอธิบายสั้น
                  <textarea value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="ข้อความสั้น ๆ สำหรับแสดงบนคลิป" className={areaClass()} />
                </label>

                <div className="rounded-[22px] border border-white/10 bg-black/24 p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#ff3b45]">ค้นหาหนัง / ซีรีส์</p>
                  <form onSubmit={searchMedia} className="mt-3 flex gap-2">
                    <input value={mediaQuery} onChange={(event) => setMediaQuery(event.target.value)} placeholder="พิมพ์ชื่อเรื่อง เช่น Wednesday, Marvel, The Boys" className={fieldClass()} />
                    <button type="submit" disabled={mediaSearching} className="h-11 shrink-0 rounded-2xl bg-white/[0.10] px-4 text-xs font-black text-white/74 ring-1 ring-white/10 disabled:opacity-50">{mediaSearching ? 'ค้นหา...' : 'ค้นหา'}</button>
                  </form>
                  {mediaResults.length ? (
                    <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto pr-1">
                      {mediaResults.map((item) => (
                        <button key={`${item.mediaType}-${item.id}`} type="button" onClick={() => selectMedia(item)} className="grid grid-cols-[48px_1fr] gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-2 text-left hover:bg-white/[0.09]">
                          <div className="aspect-[2/3] overflow-hidden rounded-xl bg-white/[0.06]">{item.posterUrl ? <img src={item.posterUrl} alt="" className="h-full w-full object-cover" /> : null}</div>
                          <div className="min-w-0 py-1">
                            <p className="truncate text-sm font-black text-white">{item.title}</p>
                            <p className="mt-1 text-[11px] font-bold text-white/44">{item.mediaType.toUpperCase()} {item.year ? `· ${item.year}` : ''} {item.rating ? `· ${item.rating.toFixed(1)}` : ''}</p>
                            <p className="mt-1 truncate text-[11px] font-semibold text-white/34">{item.genres?.join(' · ') || item.titleEn || 'TMDB'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="grid gap-1.5 text-xs font-black text-white/58">ประเภท
                    <select value={form.clipType} onChange={(event) => update('clipType', event.target.value as MediaClipType)} className={fieldClass()}>
                      {mediaClipTypes.map((type) => <option key={type} value={type}>{clipTypeLabels[type]}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-xs font-black text-white/58">ระดับสปอย
                    <select value={form.spoilerLevel} onChange={(event) => update('spoilerLevel', event.target.value as MediaClipSpoilerLevel)} className={fieldClass()}>
                      {mediaClipSpoilerLevels.map((level) => <option key={level} value={level}>{spoilerLabels[level]}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-xs font-black text-white/58">ภาษา
                    <select value={form.language} onChange={(event) => update('language', event.target.value as MediaClipLanguage)} className={fieldClass()}>
                      {mediaClipLanguages.map((language) => <option key={language} value={language}>{languageLabels[language]}</option>)}
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="grid gap-1.5 text-xs font-black text-white/58">Media Type
                    <select value={form.mediaType} onChange={(event) => update('mediaType', event.target.value as '' | MediaType)} className={fieldClass()}>
                      <option value="">ไม่ผูก</option>
                      <option value="movie">Movie</option>
                      <option value="tv">TV</option>
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-xs font-black text-white/58">TMDB ID
                    <input value={form.tmdbId} onChange={(event) => update('tmdbId', event.target.value)} inputMode="numeric" placeholder="เช่น 12345" className={fieldClass()} />
                  </label>
                  <label className="grid gap-1.5 text-xs font-black text-white/58">ชื่อหนัง/ซีรีส์
                    <input value={form.mediaTitle} onChange={(event) => update('mediaTitle', event.target.value)} placeholder="ชื่อเรื่องที่เกี่ยวข้อง" className={fieldClass()} />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-black text-white/58">แนวหนัง
                    <input value={form.genres} onChange={(event) => update('genres', event.target.value)} placeholder="Action, Horror, Thriller" className={fieldClass()} />
                  </label>
                  <label className="grid gap-1.5 text-xs font-black text-white/58">Poster URL
                    <input value={form.posterUrl} onChange={(event) => update('posterUrl', event.target.value)} placeholder="ถ้ามีภาพปกของหนัง" className={fieldClass()} />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="grid gap-1.5 text-xs font-black text-white/58">สถานะ
                    <select value={form.status} onChange={(event) => update('status', event.target.value as MediaClipStatus)} className={fieldClass()}>
                      {mediaClipStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-xs font-black text-white/58">ลำดับ
                    <input value={form.sortOrder} onChange={(event) => update('sortOrder', event.target.value)} inputMode="numeric" className={fieldClass()} />
                  </label>
                  <div className="grid grid-cols-2 gap-2 pt-5">
                    <label className="flex items-center gap-2 rounded-2xl bg-black/28 px-3 py-2 text-xs font-black text-white/62 ring-1 ring-white/8"><input type="checkbox" checked={form.showHome} onChange={(event) => update('showHome', event.target.checked)} /> หน้าแรก</label>
                    <label className="flex items-center gap-2 rounded-2xl bg-black/28 px-3 py-2 text-xs font-black text-white/62 ring-1 ring-white/8"><input type="checkbox" checked={form.showClips} onChange={(event) => update('showClips', event.target.checked)} /> หน้า Clips</label>
                  </div>
                </div>

                <button disabled={saving} className="mt-1 h-12 rounded-2xl bg-[#e50914] text-sm font-black text-white shadow-[0_16px_40px_rgba(229,9,20,0.28)] disabled:cursor-not-allowed disabled:opacity-50" type="submit">
                  {saving ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'เพิ่มคลิป'}
                </button>
              </div>
            </form>

            <aside className="rounded-[26px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_22px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.06)] md:p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#ff3b45]">Preview</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">ตัวอย่างคลิป</h2>
              <div className="mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-black/40">
                {parsedPreview ? (
                  <div>
                    <div className="aspect-video bg-black">
                      <iframe src={parsedPreview.embedUrl} title="YouTube preview" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                    </div>
                    <div className="space-y-2 p-4">
                      <p className="text-xs font-black text-white/44">Video ID: {parsedPreview.videoId}</p>
                      <p className="break-all text-[11px] font-semibold leading-5 text-white/36">{parsedPreview.embedUrl}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid aspect-video place-items-center p-6 text-center text-sm font-black text-white/32">วาง YouTube URL เพื่อดู Preview</div>
                )}
              </div>
            </aside>
          </section>

          <section className="rounded-[26px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_22px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.06)] md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#ff3b45]">Library</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">รายการคลิป</h2>
              </div>
              <button type="button" onClick={() => void loadClips()} className="rounded-2xl bg-white/[0.08] px-4 py-2 text-xs font-black text-white/68 ring-1 ring-white/10">Refresh</button>
            </div>

            <div className="mt-4 grid gap-3">
              {loading ? <p className="rounded-2xl bg-black/24 p-4 text-sm font-black text-white/42">กำลังโหลด...</p> : null}
              {!loading && !clips.length ? <p className="rounded-2xl bg-black/24 p-4 text-sm font-black text-white/42">ยังไม่มีคลิป</p> : null}
              {clips.map((clip) => (
                <article key={clip.id} className="grid gap-3 rounded-[22px] border border-white/10 bg-black/24 p-3 md:grid-cols-[120px_1fr_auto] md:items-center">
                  <div className="aspect-video overflow-hidden rounded-2xl bg-white/[0.05] md:aspect-[4/3]">
                    {clip.thumbnail_url ? <img src={clip.thumbnail_url} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-[#e50914]/18 px-2.5 py-1 text-[10px] font-black text-red-100 ring-1 ring-[#e50914]/20">{clipTypeLabels[clip.clip_type]}</span>
                      <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[10px] font-black text-white/62 ring-1 ring-white/10">{languageLabels[clip.language]}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${badgeClass(clip.status)}`}>{statusLabels[clip.status]}</span>
                      {clip.spoiler_level !== 'none' ? <span className="rounded-full bg-amber-300/12 px-2.5 py-1 text-[10px] font-black text-amber-100 ring-1 ring-amber-200/20">{spoilerLabels[clip.spoiler_level]}</span> : null}
                    </div>
                    <h3 className="mt-2 truncate text-base font-black tracking-[-0.03em] text-white">{clip.title}</h3>
                    <p className="mt-1 truncate text-xs font-bold text-white/42">{clip.media_title || 'ยังไม่ผูกหนัง'} {clip.tmdb_id ? `· TMDB ${clip.tmdb_id}` : ''}</p>
                    <p className="mt-1 truncate text-[11px] font-semibold text-white/30">{clip.genres?.join(' · ') || 'ยังไม่ใส่แนว'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <button type="button" onClick={() => editClip(clip)} className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white/70 ring-1 ring-white/10">แก้ไข</button>
                    <button type="button" onClick={() => void quickPatch(clip, { status: clip.status === 'published' ? 'hidden' : 'published' })} className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white/70 ring-1 ring-white/10">{clip.status === 'published' ? 'ซ่อน' : 'เผยแพร่'}</button>
                    <button type="button" onClick={() => void deleteClip(clip)} className="rounded-xl bg-red-500/12 px-3 py-2 text-xs font-black text-red-100 ring-1 ring-red-300/15">ลบ</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </AdminAuthGuard>
  );
}
