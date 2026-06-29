'use client';

import { useEffect, useMemo, useState } from 'react';
import { getStoredSession } from '@/lib/supabase-auth-browser';

type Membership = {
  plan?: string | null;
  status?: string | null;
  expires_at?: string | null;
};

type AdminUser = {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  membership?: Membership | null;
  favorite_count?: number;
  history_count?: number;
};

type UsersPayload = {
  ok?: boolean;
  users?: AdminUser[];
  stats?: {
    total: number;
    admins: number;
    viewers: number;
    activePremium: number;
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

function roleClass(role?: string | null) {
  return role === 'admin'
    ? 'bg-[#e50914] text-white shadow-glow'
    : 'bg-white/[0.08] text-white/62';
}

function membershipText(membership?: Membership | null) {
  if (!membership) return 'Free';
  if (membership.status === 'active') return `Premium • ${membership.plan || 'active'}`;
  return `${membership.plan || 'membership'} • ${membership.status || 'inactive'}`;
}

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<UsersPayload['stats'] | null>(null);
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
    ].filter(Boolean).join(' ').toLowerCase().includes(keyword));
  }, [query, users]);

  async function loadUsers() {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const session = getStoredSession();
      const token = session?.access_token;
      if (!token) throw new Error('ต้องเข้าสู่ระบบด้วยบัญชีแอดมินก่อน');

      const response = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = (await response.json()) as UsersPayload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลดผู้ใช้ไม่ได้');
      setUsers(payload.users || []);
      setStats(payload.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดผู้ใช้ไม่ได้');
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(user: AdminUser, role: 'viewer' | 'admin') {
    setSavingId(user.id);
    setError('');
    setMessage('');

    try {
      const session = getStoredSession();
      const token = session?.access_token;
      if (!token) throw new Error('ต้องเข้าสู่ระบบด้วยบัญชีแอดมินก่อน');

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id, role }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'เปลี่ยน role ไม่สำเร็จ');
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, role } : item));
      setMessage(`เปลี่ยน ${user.display_name || shortId(user.id)} เป็น ${role} แล้ว`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เปลี่ยน role ไม่สำเร็จ');
    } finally {
      setSavingId('');
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-5 text-white md:px-8 md:py-8">
      <div className="admin-floating-glass rounded-2xl border border-white/8 p-3 md:rounded-[28px] md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <a href="/admin" className="text-xs font-black text-[#e50914] hover:text-red-300">← กลับแดชบอร์ด</a>
            <h1 className="mt-3 text-2xl font-black tracking-[-0.04em] md:text-4xl">จัดการผู้ใช้</h1>
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-white/52">
              ดู role และสถานะสมาชิก
            </p>
          </div>
          <button onClick={loadUsers} className="rounded-xl bg-[#e50914] px-4 py-2 text-xs font-black text-white">Refresh</button>
        </div>

        {stats ? (
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-white/72">
            <span className="rounded-full bg-black/35 px-3 py-1.5">ทั้งหมด {stats.total}</span>
            <span className="rounded-full bg-[#e50914]/18 px-3 py-1.5 text-red-100">Admin {stats.admins}</span>
            <span className="rounded-full bg-black/35 px-3 py-1.5">Viewer {stats.viewers}</span>
            <span className="rounded-full bg-[#f4c46b]/18 px-3 py-1.5 text-[#f4c46b]">Premium {stats.activePremium}</span>
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-white/8 bg-black/35 p-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหา display name, user id, role, membership"
            className="h-11 w-full rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-[#e50914]"
          />
        </div>

        {message ? <p className="mt-4 rounded-2xl bg-green-400/10 px-4 py-3 text-sm font-bold text-green-100">{message}</p> : null}
        {error ? <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{error}</p> : null}

        {loading ? (
          <div className="mt-6 rounded-[28px] bg-black/35 p-6 text-sm font-black text-white/50">กำลังโหลดผู้ใช้...</div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/8 bg-black/35">
            <div className="grid grid-cols-[1.15fr_0.75fr_0.8fr_0.8fr_1fr] gap-3 border-b border-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/38 max-lg:hidden">
              <span>User</span>
              <span>Role</span>
              <span>Activity</span>
              <span>Membership</span>
              <span>Action</span>
            </div>

            <div className="divide-y divide-white/8">
              {filtered.map((user) => (
                <article key={user.id} className="grid gap-3 px-3 py-3 lg:grid-cols-[1.15fr_0.75fr_0.8fr_0.8fr_1fr] lg:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black tracking-[-0.02em]">{user.display_name || `User ${shortId(user.id)}`}</p>
                    <p className="mt-1 break-all text-[11px] font-semibold text-white/36">{user.id}</p>
                    <p className="mt-1 text-[11px] font-semibold text-white/28">สมัคร {formatDate(user.created_at)}</p>
                  </div>

                  <div>
                    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${roleClass(user.role)}`}>{user.role || 'viewer'}</span>
                  </div>

                  <div className="text-xs font-bold text-white/50">
                    <p>♡ Favorites {user.favorite_count || 0}</p>
                    <p className="mt-1">⏱ History {user.history_count || 0}</p>
                  </div>

                  <div>
                    <p className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${user.membership?.status === 'active' ? 'bg-[#f4c46b] text-black' : 'bg-white/[0.08] text-white/52'}`}>{membershipText(user.membership)}</p>
                    {user.membership?.expires_at ? <p className="mt-1 text-[11px] text-white/32">หมดอายุ {formatDate(user.membership.expires_at)}</p> : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updateRole(user, 'viewer')}
                      disabled={savingId === user.id || user.role === 'viewer'}
                      className="rounded-xl bg-white/[0.08] px-3 py-1.5 text-[11px] font-black text-white/70 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      Viewer
                    </button>
                    <button
                      onClick={() => updateRole(user, 'admin')}
                      disabled={savingId === user.id || user.role === 'admin'}
                      className="rounded-xl bg-[#e50914] px-3 py-1.5 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      Admin
                    </button>
                  </div>
                </article>
              ))}

              {!filtered.length ? (
                <div className="px-4 py-10 text-center text-sm font-bold text-white/38">ไม่พบผู้ใช้</div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
