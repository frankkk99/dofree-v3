'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminSessionHeaders } from '@/lib/admin-session-browser';

type AuditLog = {
  id: string;
  actor_label?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  before_data?: unknown;
  after_data?: unknown;
  ip_address?: string | null;
  created_at: string;
};

type Payload = {
  ok?: boolean;
  logs?: AuditLog[];
  error?: string;
};

const sensitiveKeys = new Set(['watch_url', 'trailer_url', 'url', 'slip_url']);

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function displayValue(key: string, value: unknown) {
  if (value == null || value === '') return '-';
  if (sensitiveKeys.has(key)) return '[protected]';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.join(', ');
  return JSON.stringify(value);
}

function changedFields(log: AuditLog) {
  const before = asRecord(log.before_data);
  const after = asRecord(log.after_data);
  if (!before && !after) return [];

  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  return [...keys]
    .filter((key) => JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after?.[key] ?? null))
    .filter((key) => !['created_at', 'updated_at', 'raw'].includes(key))
    .slice(0, 8);
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    'movie_link.upsert.create': 'เพิ่มลิงก์',
    'movie_link.upsert.update': 'อัปเดตลิงก์',
    'movie_link.patch': 'แก้ไขรายการ',
    'watch_link.search_create': 'เพิ่มจากค้นหา',
    'watch_link.search_update': 'อัปเดตจากค้นหา',
    'movie_link.csv_import': 'Import CSV',
    'tmdb_catalog.sync_batch': 'Sync TMDB',
    'user.role_update': 'เปลี่ยน Role',
    'membership.update': 'อัปเดตสมาชิก',
  };
  return labels[action] || action;
}

function entityLabel(entity?: string | null) {
  if (entity === 'admin_movie_links') return 'Catalog';
  if (entity === 'memberships') return 'Membership';
  if (entity === 'profiles') return 'User';
  if (entity === 'tmdb_catalog_sync_runs') return 'TMDB Sync';
  return entity || 'System';
}

export function AdminAuditLogPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return logs;
    return logs.filter((log) => [
      log.action,
      log.actor_label,
      log.entity_type,
      log.entity_id,
      log.ip_address,
    ].filter(Boolean).join(' ').toLowerCase().includes(keyword));
  }, [logs, query]);

  async function loadLogs() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/audit-logs?limit=20', {
        headers: adminSessionHeaders(),
        cache: 'no-store',
      });
      const payload = (await response.json()) as Payload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลดประวัติไม่สำเร็จ');
      setLogs(payload.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดประวัติไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
  }, []);

  return (
    <section id="update-history" className="mx-auto w-full max-w-7xl px-4 py-5 text-white md:px-8 md:py-8">
      <div className="admin-floating-glass rounded-2xl border border-white/8 p-3 md:rounded-[28px] md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.04em] md:text-3xl">Audit Log</h2>
            <p className="mt-1 max-w-2xl text-sm font-semibold text-white/45">ล่าสุด 20 รายการ</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหา action, admin, id"
              className="h-10 rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-[#e50914]"
            />
            <button onClick={loadLogs} className="h-10 rounded-xl bg-[#e50914] px-4 text-xs font-black text-white">Refresh</button>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{error}</p> : null}

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/8">
          <div className="grid grid-cols-[0.9fr_0.8fr_0.85fr_0.8fr_1.2fr] gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/36 max-lg:hidden">
            <span>Time</span>
            <span>Admin</span>
            <span>Action</span>
            <span>Target</span>
            <span>Changed Fields</span>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-sm font-black text-white/42">กำลังโหลดประวัติ...</div>
          ) : filtered.length ? (
            <div className="divide-y divide-white/8">
              {filtered.map((log) => {
                const fields = changedFields(log);
                const after = asRecord(log.after_data);
                return (
                  <details key={log.id} className="group px-3 py-3 lg:px-4">
                    <summary className="grid cursor-pointer gap-1 marker:text-white/30 lg:grid-cols-[0.9fr_0.8fr_0.85fr_0.8fr_1.2fr] lg:gap-3">
                    <div>
                      <p className="text-sm font-black text-white/82">{formatDate(log.created_at)}</p>
                      <p className="mt-1 text-[11px] font-semibold text-white/30">{log.ip_address || '-'}</p>
                    </div>
                    <p className="break-words text-sm font-bold text-white/62">{log.actor_label || 'Admin'}</p>
                    <div>
                      <p className="text-sm font-black text-white">{actionLabel(log.action)}</p>
                      <p className="mt-1 text-[11px] font-semibold text-white/32">{log.action}</p>
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#f4c46b]">{entityLabel(log.entity_type)}</p>
                      <p className="mt-1 break-all text-[11px] font-semibold text-white/34">{log.entity_id || '-'}</p>
                    </div>
                    <div className="hidden flex-wrap gap-2 lg:flex">
                      {fields.length ? fields.map((field) => (
                        <span key={field} className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[11px] font-bold text-white/62">
                          {field}: {displayValue(field, after?.[field])}
                        </span>
                      )) : (
                        <span className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[11px] font-bold text-white/40">summary</span>
                      )}
                    </div>
                    </summary>
                    <div className="mt-3 flex flex-wrap gap-2 rounded-xl bg-white/[0.04] p-3 lg:hidden">
                      {fields.length ? fields.map((field) => (
                        <span key={field} className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[11px] font-bold text-white/62">
                          {field}: {displayValue(field, after?.[field])}
                        </span>
                      )) : (
                        <span className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[11px] font-bold text-white/40">summary</span>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-8 text-sm font-black text-white/42">ยังไม่พบประวัติการแก้ไข</div>
          )}
        </div>
      </div>
    </section>
  );
}
