'use client';

import { useEffect, useState } from 'react';
import { getStoredSession } from '@/lib/supabase-auth-browser';

type AuditLog = {
  id: string;
  actor_label?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  after_data?: Record<string, unknown> | null;
  created_at: string;
};

type Payload = {
  ok: boolean;
  logs?: AuditLog[];
  error?: string;
};

function authHeaders(): HeadersInit | null {
  const session = getStoredSession();
  if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` };

  const token = (window.localStorage.getItem('dofree_admin_token') || '').trim();
  return token ? { 'x-admin-token': token } : null;
}

function actionLabel(action: string) {
  if (action === 'create_movie_link') return 'เพิ่มลิงก์รับชม';
  if (action === 'update_movie_link') return 'แก้ไขลิงก์รับชม';
  if (action === 'patch_movie_link') return 'ปรับสถานะลิงก์';
  if (action === 'bulk_import_movie_links') return 'Import CSV';
  return action.replace(/_/g, ' ');
}

function timeLabel(value: string) {
  try {
    return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

function detail(log: AuditLog) {
  const data = log.after_data || {};
  if (typeof data.imported === 'number') return `${data.imported} imported / ${data.skipped || 0} skipped`;
  if (typeof data.title_th === 'string') return data.title_th;
  if (typeof data.title === 'string') return data.title;
  return log.entity_id || log.entity_type || '-';
}

export function AdminAuditPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadLogs() {
    const headers = authHeaders();
    if (!headers) {
      setLoading(false);
      setError('เข้าสู่ระบบแอดมิน หรือใส่ Admin Token ใน Catalog ก่อน');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/audit-logs?limit=20', { headers, cache: 'no-store' });
      const payload = (await response.json()) as Payload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลดประวัติไม่ได้');
      setLogs(payload.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดประวัติไม่ได้');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
  }, []);

  return (
    <section id="audit" className="mx-auto w-full max-w-7xl px-4 pb-8 text-white md:px-8">
      <div className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#e50914]">Maintenance History</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] md:text-4xl">ประวัติการดูแลระบบ</h2>
            <p className="mt-2 text-sm font-semibold text-white/42">บันทึกการแก้ลิงก์และ import ล่าสุดสำหรับตรวจย้อนหลัง</p>
          </div>
          <button onClick={loadLogs} className="rounded-2xl bg-white/[0.08] px-4 py-3 text-xs font-black text-white/75 hover:bg-white/[0.14]">Refresh</button>
        </div>

        {loading ? <p className="mt-5 rounded-2xl bg-black/25 p-4 text-sm font-bold text-white/45">กำลังโหลดประวัติ...</p> : null}
        {error ? <p className="mt-5 rounded-2xl bg-red-500/10 p-4 text-sm font-bold text-red-100">{error}</p> : null}
        {!loading && !error && !logs.length ? <p className="mt-5 rounded-2xl bg-black/25 p-4 text-sm font-bold text-white/45">ยังไม่มีประวัติการแก้ไข</p> : null}

        {logs.length ? (
          <div className="mt-5 grid gap-2">
            {logs.map((log) => (
              <article key={log.id} className="grid gap-2 rounded-2xl bg-black/28 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white/82">{actionLabel(log.action)} · {detail(log)}</p>
                  <p className="mt-1 text-xs font-semibold text-white/36">{log.actor_label || 'System'} · {log.entity_id || log.entity_type || '-'}</p>
                </div>
                <p className="text-xs font-bold text-white/42">{timeLabel(log.created_at)}</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
