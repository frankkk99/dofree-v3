'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { canManageAccessControl } from '@/lib/admin-access-control';
import { getStoredSession } from '@/lib/supabase-auth-browser';

type ProfileResponse = {
  ok?: boolean;
  role?: string;
  profile?: { role?: string | null } | null;
};

export function AdminOwnerGuard({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkOwner() {
      setLoading(true);
      const session = getStoredSession();
      const token = session?.access_token;
      if (!token) {
        if (active) {
          setAllowed(false);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch('/api/profile/me', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const payload = (await response.json()) as ProfileResponse;
        if (!active) return;
        setAllowed(Boolean(response.ok && payload.ok && canManageAccessControl({ role: payload.role, profile: payload.profile })));
      } catch {
        if (active) setAllowed(false);
      } finally {
        if (active) setLoading(false);
      }
    }

    void checkOwner();
    window.addEventListener('storage', checkOwner);
    window.addEventListener('dofree-auth-change', checkOwner);
    return () => {
      active = false;
      window.removeEventListener('storage', checkOwner);
      window.removeEventListener('dofree-auth-change', checkOwner);
    };
  }, []);

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-10 text-sm font-black text-white/54">กำลังตรวจสอบสิทธิ์ Owner...</div>;
  }

  if (!allowed) {
    return (
      <main className="admin-shell grid min-h-screen place-items-center px-4 text-white">
        <section className="admin-floating-glass w-full max-w-lg rounded-[28px] border border-white/10 p-6 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[#e50914]">Owner Access</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.06em]">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/66">หน้านี้เปิดให้ Owner เท่านั้น หากต้องใช้งานให้ติดต่อ Owner ของระบบ</p>
          <a href="/admin" className="mt-6 inline-flex rounded-2xl bg-white/[0.08] px-5 py-3 text-sm font-black text-white/72 hover:bg-white/[0.14]">กลับ Admin</a>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
