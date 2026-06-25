'use client';

import { useEffect, useMemo, useState } from 'react';
import { getStoredSession } from '@/lib/supabase-auth-browser';

type Membership = {
  id?: string;
  user_id: string;
  plan?: string | null;
  status?: string | null;
  slip_url?: string | null;
  started_at?: string | null;
  expires_at?: string | null;
  updated_at?: string | null;
};

type MembershipUser = {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  created_at?: string | null;
  membership?: Membership | null;
};

type Payload = {
  ok?: boolean;
  users?: MembershipUser[];
  stats?: {
    totalUsers: number;
    membershipRows: number;
    active: number;
    pending: number;
    expired: number;
    inactive: number;
  };
  error?: string;
};

function shortId(id: string) {
  return id.slice(0, 8);
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusClass(status?: string | null) {
  if (status === 'active') return 'bg-[#f4c46b] text-black';
  if (status === 'pending') return 'bg-sky-500/15 text-sky-100';
  if (status === 'expired') return 'bg-orange-500/15 text-orange-100';
  return 'bg-white/[0.08] text-white/52';
}

function membershipLabel(membership?: Membership | null) {
  if (!membership) return 'Free / inactive';
  return `${membership.plan || 'free'} / ${membership.status || 'inactive'}`;
}

export function AdminMembershipsPanel() {
  const [users, setUsers] = useState<MembershipUser[]>([]);
  const [stats, setStats] = useState<Payload['stats'] | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((user) => [
      user.id,
      user.display_name,
      user.role,
      user.membership?.plan,
      user.membership?.status,
      user.membership?.slip_url,
    ].filter(Boolean).join(' ').toLowerCase().includes(keyword));
  }, [query, users]);

  async function loadMemberships() {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const session = getStoredSession();
      const token = session?.access_token;
      if (!token) throw new Error('ต้องเข้าสู่ระบบด้วยบัญชีแอดมินก่อน');

      const response = await fetch('/api/admin/memberships', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = (await response.json()) as Payload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลดสมาชิกไม่ได้');
      setUsers(payload.users || []);
      setStats(payload.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดสมาชิกไม่ได้');
    } finally {
      setLoading(false);
    }
  }

  async function updateMembership(user: MembershipUser, status: 'inactive' | 'pending' | 'active' | 'expired', durationDays?: number) {
    setSavingId(user.id);
    setError('');
    setMessage('');

    try {
      const session = getStoredSession();
      const token = session?.access_token;
      if (!token) throw new Error('ต้องเข้าสู่ระบบด้วยบัญชีแอดมินก่อน');

      const plan = status === 'active' || status === 'pending' ? 'premium' : 'free';
      const response = await fetch('/api/admin/memberships', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          plan,
          status,
          durationDays: durationDays || null,
          slipUrl: user.membership?.slip_url || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'อัปเดตสมาชิกไม่สำเร็จ');
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, membership: payload.membership } : item));
      setMessage(`อัปเดต ${user.display_name || shortId(user.id)} เป็น ${status} แล้ว`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อัปเดตสมาชิกไม่สำเร็จ');
    } finally {
      setSavingId('');
    }
  }

  useEffect(() => {
    void loadMemberships();
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 text-white md:px-8">
      <div className="rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(244,196,107,0.18),transparent_34%),rgba(255,255,255,0.045)] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.62)] md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <a href="/admin" className="text-xs font-black text-[#e50914] hover:text-red-300">← กลับแดชบอร์ด</a>
            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.30em] text-[#f4c46b]">Premium Control</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.08em] md:text-7xl">จัดการสมาชิก</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/52 md:text-base">
              อนุมัติ Premium, ตั้งวันหมดอายุ, ปิดสถานะสมาชิก และเตรียมต่อระบบสลิป/แพ็กเกจจริง
            </p>
          </div>
          <button onClick={loadMemberships} className="rounded-2xl bg-[#e50914] px-5 py-3 text-sm font-black text-white shadow-glow">Refresh</button>
        </div>

        {stats ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-[26px] border border-white/10 bg-black/35 p-5"><p className="text-xs font-bold text-white/36">Users</p><p className="mt-2 text-4xl font-black">{stats.totalUsers}</p></div>
            <div className="rounded-[26px] border border-white/10 bg-black/35 p-5"><p className="text-xs font-bold text-white/36">Active</p><p className="mt-2 text-4xl font-black text-[#f4c46b]">{stats.active}</p></div>
            <div className="rounded-[26px] border border-white/10 bg-black/35 p-5"><p className="text-xs font-bold text-white/36">Pending</p><p className="mt-2 text-4xl font-black text-sky-200">{stats.pending}</p></div>
            <div className="rounded-[26px] border border-white/10 bg-black/35 p-5"><p className="text-xs font-bold text-white/36">Expired</p><p className="mt-2 text-4xl font-black text-orange-200">{stats.expired}</p></div>
            <div className="rounded-[26px] border border-white/10 bg-black/35 p-5"><p className="text-xs font-bold text-white/36">Inactive</p><p className="mt-2 text-4xl font-black">{stats.inactive}</p></div>
          </div>
        ) : null}

        <div className="mt-6 rounded-[26px] border border-white/10 bg-black/35 p-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหา display name, user id, plan, status, slip"
            className="h-12 w-full rounded-2xl border border-white/10 bg-black/45 px-4 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-[#e50914]"
          />
        </div>

        {message ? <p className="mt-4 rounded-2xl bg-green-400/10 px-4 py-3 text-sm font-bold text-green-100">{message}</p> : null}
        {error ? <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{error}</p> : null}

        {loading ? (
          <div className="mt-6 rounded-[28px] bg-black/35 p-6 text-sm font-black text-white/50">กำลังโหลดสมาชิก...</div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-black/35">
            <div className="grid grid-cols-[1.1fr_0.85fr_0.9fr_1.35fr] gap-3 border-b border-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/38 max-lg:hidden">
              <span>User</span>
              <span>Membership</span>
              <span>Expiry</span>
              <span>Action</span>
            </div>

            <div className="divide-y divide-white/8">
              {filtered.map((user) => (
                <article key={user.id} className="grid gap-4 px-4 py-4 lg:grid-cols-[1.1fr_0.85fr_0.9fr_1.35fr] lg:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black tracking-[-0.03em]">{user.display_name || `User ${shortId(user.id)}`}</p>
                    <p className="mt-1 break-all text-[11px] font-semibold text-white/36">{user.id}</p>
                    <p className="mt-1 text-[11px] font-semibold text-white/28">role: {user.role || 'viewer'} • สมัคร {formatDate(user.created_at)}</p>
                  </div>

                  <div>
                    <p className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${statusClass(user.membership?.status)}`}>{membershipLabel(user.membership)}</p>
                    {user.membership?.slip_url ? <a href={user.membership.slip_url} target="_blank" className="mt-2 block text-[11px] font-black text-[#e50914]">ดูสลิป</a> : null}
                  </div>

                  <div>
                    <p className="text-sm font-black text-white/72">{formatDate(user.membership?.expires_at)}</p>
                    <p className="mt-1 text-[11px] text-white/32">updated {formatDate(user.membership?.updated_at)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button disabled={savingId === user.id} onClick={() => updateMembership(user, 'pending')} className="rounded-xl bg-sky-500/15 px-4 py-2 text-xs font-black text-sky-100 disabled:opacity-35">Pending</button>
                    <button disabled={savingId === user.id} onClick={() => updateMembership(user, 'active', 30)} className="rounded-xl bg-[#f4c46b] px-4 py-2 text-xs font-black text-black disabled:opacity-35">Active 30d</button>
                    <button disabled={savingId === user.id} onClick={() => updateMembership(user, 'active', 365)} className="rounded-xl bg-[#e50914] px-4 py-2 text-xs font-black text-white disabled:opacity-35">Active 1y</button>
                    <button disabled={savingId === user.id} onClick={() => updateMembership(user, 'expired')} className="rounded-xl bg-orange-500/15 px-4 py-2 text-xs font-black text-orange-100 disabled:opacity-35">Expired</button>
                    <button disabled={savingId === user.id} onClick={() => updateMembership(user, 'inactive')} className="rounded-xl bg-white/[0.08] px-4 py-2 text-xs font-black text-white/70 disabled:opacity-35">Inactive</button>
                  </div>
                </article>
              ))}

              {!filtered.length ? (
                <div className="px-4 py-10 text-center text-sm font-bold text-white/38">ไม่พบสมาชิก</div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
