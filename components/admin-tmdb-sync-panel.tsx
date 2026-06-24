'use client';

import { useEffect, useMemo, useState } from 'react';

type SyncResponse = {
  ok: boolean;
  runId?: number;
  upserted?: number;
  skipped?: number;
  cursor?: number;
  nextCursor?: number;
  totalTasks?: number;
  done?: boolean;
  message?: string;
  error?: string;
};

type StatsResponse = {
  ok: boolean;
  total?: number;
  buckets?: Array<{ source_bucket: string; total: number; avg_rating: number; max_rating: number }>;
  error?: string;
};

function cardClass() {
  return 'rounded-[30px] bg-white/[0.035] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.06] backdrop-blur-2xl';
}

function buttonClass(active = true) {
  return `h-11 rounded-2xl px-5 text-xs font-black shadow-[0_16px_48px_rgba(0,0,0,0.45)] transition ${
    active ? 'bg-[#e50914] text-white hover:scale-[1.01]' : 'cursor-not-allowed bg-white/[0.075] text-white/35'
  }`;
}

function cleanAdminToken(value: string) {
  return value.trim().replace(/^DOFREE_ADMIN_TOKEN\s*=\s*/i, '').trim();
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`เซิร์ฟเวอร์ตอบกลับว่างเปล่า อาจเกิด timeout จาก Vercel หรือ request หนักเกินไป ลองลด Pages / Run เหลือ 10–20`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.slice(0, 260) || 'อ่านผลลัพธ์จากเซิร์ฟเวอร์ไม่ได้');
  }
}

export function AdminTmdbSyncPanel() {
  const [adminToken, setAdminToken] = useState('');
  const [cursor, setCursor] = useState(0);
  const [pagesPerRun, setPagesPerRun] = useState(20);
  const [targetLimit, setTargetLimit] = useState(10000);
  const [running, setRunning] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [log, setLog] = useState<SyncResponse[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const latest = log[0];
  const progress = useMemo(() => {
    const totalTasks = latest?.totalTasks || 0;
    const nextCursor = latest?.nextCursor ?? cursor;
    if (!totalTasks) return 0;
    return Math.min(100, Math.round((nextCursor / totalTasks) * 100));
  }, [cursor, latest]);

  useEffect(() => {
    const savedToken = window.localStorage.getItem('dofree_admin_token') || '';
    if (savedToken) setAdminToken(savedToken);
  }, []);

  async function loadStats(token = adminToken) {
    const cleanToken = cleanAdminToken(token);
    if (!cleanToken) {
      setError('ใส่เฉพาะค่า Admin Token หลังเครื่องหมาย =');
      return;
    }

    try {
      const response = await fetch('/api/admin/tmdb-catalog-stats', {
        headers: { 'x-admin-token': cleanToken },
        cache: 'no-store',
      });
      const payload = await readJsonResponse<StatsResponse>(response);
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลดสถิติไม่สำเร็จ');
      setStats(payload);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'โหลดสถิติไม่สำเร็จ');
    }
  }

  async function syncOnce(nextCursor = cursor) {
    const cleanToken = cleanAdminToken(adminToken);
    if (!cleanToken) {
      setError('ใส่เฉพาะค่า Admin Token หลังเครื่องหมาย = เช่น dofree_admin_xxx ไม่ต้องใส่ DOFREE_ADMIN_TOKEN=');
      return null;
    }

    window.localStorage.setItem('dofree_admin_token', cleanToken);
    setAdminToken(cleanToken);
    setRunning(true);
    setError(null);

    try {
      const safePagesPerRun = Math.min(Math.max(Number(pagesPerRun || 20), 1), 40);
      const response = await fetch('/api/admin/tmdb-catalog-sync', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-token': cleanToken,
        },
        body: JSON.stringify({ cursor: nextCursor, pagesPerRun: safePagesPerRun, targetLimit }),
      });
      const payload = await readJsonResponse<SyncResponse>(response);
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Sync ไม่สำเร็จ');

      setPagesPerRun(safePagesPerRun);
      setCursor(payload.nextCursor || nextCursor);
      setLog((items) => [payload, ...items].slice(0, 20));
      await loadStats(cleanToken);
      return payload;
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Sync ไม่สำเร็จ';
      setError(message);
      setAutoRun(false);
      return null;
    } finally {
      setRunning(false);
    }
  }

  async function syncAuto() {
    setAutoRun(true);
    let current = cursor;

    for (let round = 0; round < 20; round += 1) {
      const payload = await syncOnce(current);
      if (!payload || payload.done) {
        setAutoRun(false);
        return;
      }
      current = payload.nextCursor || current + Math.min(Math.max(Number(pagesPerRun || 20), 1), 40);
      await new Promise((resolve) => window.setTimeout(resolve, 900));
    }

    setAutoRun(false);
  }

  function resetProgress() {
    setCursor(0);
    setLog([]);
    setError(null);
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 text-white md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-[34px] bg-[radial-gradient(circle_at_18%_10%,rgba(229,9,20,0.34),transparent_28rem),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_34px_140px_rgba(0,0,0,0.72)] ring-1 ring-white/[0.06] backdrop-blur-2xl md:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-[#e50914]">DOFree Admin</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.07em] md:text-6xl">Sync TMDB Catalog</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/56 md:text-base">
            ดึง metadata หนังเข้า Supabase โดยเก็บเฉพาะข้อมูลและ URL รูป ไม่เก็บไฟล์ภาพหรือวิดีโอ เริ่มรอบละ 20 หน้าเพื่อกัน Vercel timeout
          </p>
        </section>

        <section className={cardClass()}>
          <div className="grid gap-4 md:grid-cols-[1.4fr_0.6fr_0.6fr_0.6fr]">
            <label>
              <span className="text-xs font-black text-white/46">Admin Token</span>
              <input
                value={adminToken}
                onChange={(event) => setAdminToken(event.target.value)}
                onBlur={() => setAdminToken((value) => cleanAdminToken(value))}
                placeholder="ใส่เฉพาะ token ไม่ต้องใส่ DOFREE_ADMIN_TOKEN="
                className="mt-2 h-11 w-full rounded-2xl bg-white/[0.075] px-4 text-sm font-bold text-white outline-none ring-1 ring-white/[0.06] placeholder:text-white/28 focus:ring-[#e50914]/70"
              />
            </label>
            <label>
              <span className="text-xs font-black text-white/46">Cursor</span>
              <input
                type="number"
                value={cursor}
                onChange={(event) => setCursor(Number(event.target.value || 0))}
                className="mt-2 h-11 w-full rounded-2xl bg-white/[0.075] px-4 text-sm font-bold text-white outline-none ring-1 ring-white/[0.06] focus:ring-[#e50914]/70"
              />
            </label>
            <label>
              <span className="text-xs font-black text-white/46">Pages / Run</span>
              <input
                type="number"
                value={pagesPerRun}
                onChange={(event) => setPagesPerRun(Number(event.target.value || 20))}
                className="mt-2 h-11 w-full rounded-2xl bg-white/[0.075] px-4 text-sm font-bold text-white outline-none ring-1 ring-white/[0.06] focus:ring-[#e50914]/70"
              />
            </label>
            <label>
              <span className="text-xs font-black text-white/46">Target</span>
              <input
                type="number"
                value={targetLimit}
                onChange={(event) => setTargetLimit(Number(event.target.value || 10000))}
                className="mt-2 h-11 w-full rounded-2xl bg-white/[0.075] px-4 text-sm font-bold text-white outline-none ring-1 ring-white/[0.06] focus:ring-[#e50914]/70"
              />
            </label>
          </div>

          <div className="mt-4 rounded-2xl bg-[#f4c46b]/10 p-3 text-xs font-bold leading-5 text-[#f4c46b]">
            แนะนำ: ใช้ Pages / Run = 20 ก่อน ถ้ายัง timeout ให้ลดเหลือ 10 ถ้าผ่านค่อยเพิ่มเป็น 30–40
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => void syncOnce()} disabled={running || autoRun} className={buttonClass(!running && !autoRun)}>
              {running ? 'กำลัง Sync...' : 'Sync 1 รอบ'}
            </button>
            <button type="button" onClick={() => void syncAuto()} disabled={running || autoRun} className={buttonClass(!running && !autoRun)}>
              {autoRun ? 'Auto Sync กำลังทำงาน...' : 'Auto Sync ต่อเนื่อง'}
            </button>
            <button type="button" onClick={() => void loadStats()} className="h-11 rounded-2xl bg-white/[0.08] px-5 text-xs font-black text-white/68 shadow-[0_16px_48px_rgba(0,0,0,0.35)] hover:bg-white/[0.12]">
              โหลดสถิติ
            </button>
            <button type="button" onClick={resetProgress} className="h-11 rounded-2xl bg-white/[0.08] px-5 text-xs font-black text-white/68 shadow-[0_16px_48px_rgba(0,0,0,0.35)] hover:bg-white/[0.12]">
              เริ่ม Cursor 0 ใหม่
            </button>
          </div>

          <div className="mt-5 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="h-3 rounded-full bg-[#e50914] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs font-bold text-white/42">Progress โดยประมาณ: {progress}%</p>
          {error ? <p className="mt-4 rounded-2xl bg-red-500/[0.1] p-3 text-sm font-bold text-red-100">{error}</p> : null}
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className={cardClass()}>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#e50914]">Catalog Stats</p>
            <h2 className="mt-2 text-4xl font-black tracking-[-0.07em]">{stats?.total ?? 0}</h2>
            <p className="text-sm font-bold text-white/44">เรื่องใน tmdb_catalog</p>
            <div className="mt-5 space-y-2">
              {(stats?.buckets || []).slice(0, 12).map((bucket) => (
                <div key={bucket.source_bucket} className="flex items-center justify-between rounded-2xl bg-white/[0.055] px-3 py-2 text-xs font-bold text-white/64">
                  <span>{bucket.source_bucket}</span>
                  <span>{bucket.total} • ★ {Number(bucket.avg_rating || 0).toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={cardClass()}>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#e50914]">Sync Log</p>
            <div className="mt-4 space-y-2">
              {!log.length ? <p className="rounded-2xl bg-white/[0.05] p-4 text-sm font-bold text-white/42">ยังไม่มี log กด Sync 1 รอบเพื่อเริ่มดึงข้อมูล</p> : null}
              {log.map((item, index) => (
                <div key={`${item.runId}-${index}`} className="rounded-2xl bg-white/[0.055] p-3 text-xs font-bold text-white/64">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>Run #{item.runId || '-'}</span>
                    <span>{item.done ? 'เสร็จแล้ว' : `nextCursor: ${item.nextCursor}`}</span>
                  </div>
                  <p className="mt-1 text-white/42">upserted {item.upserted || 0} • skipped {item.skipped || 0} • totalTasks {item.totalTasks || 0}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={cardClass()}>
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#e50914]">คำแนะนำ</p>
          <div className="mt-3 grid gap-3 text-sm font-semibold leading-6 text-white/58 md:grid-cols-3">
            <p>1. ใส่เฉพาะ token หลังเครื่องหมาย = ไม่ต้องใส่ชื่อ DOFREE_ADMIN_TOKEN</p>
            <p>2. Sync ให้ได้ 3,000–5,000 เรื่องก่อน แล้วเปิด /admin ตรวจว่าหน้าโหลดไหว</p>
            <p>3. ขั้นถัดไปควรเปลี่ยนหน้าเว็บหลักให้อ่านจาก tmdb_catalog แทน TMDB สด</p>
          </div>
        </section>
      </div>
    </main>
  );
}
