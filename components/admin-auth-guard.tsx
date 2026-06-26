'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { getStoredSession } from '@/lib/supabase-auth-browser';

type ProfileResponse = {
  ok?: boolean;
  role?: string;
  isAdmin?: boolean;
  error?: string;
};

export function AdminAuthGuard({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState('กำลังตรวจสอบสิทธิ์บัญชี...');

  useEffect(() => {
    let active = true;

    async function check() {
      setLoading(true);
      const session = getStoredSession();
      const token = session?.access_token;

      if (!token) {
        if (!active) return;
        setIsAdmin(false);
        setMessage('เข้าสู่ระบบเพื่อดำเนินการต่อ');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/profile/me', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const payload = (await response.json()) as ProfileResponse;
        if (!active) return;

        setIsAdmin(Boolean(response.ok && payload.ok && payload.isAdmin));
        setMessage(payload.isAdmin ? 'พร้อมใช้งาน' : 'บัญชีนี้ไม่มีสิทธิ์เข้าพื้นที่นี้');
      } catch {
        if (!active) return;
        setIsAdmin(false);
        setMessage('ตรวจสอบสิทธิ์บัญชีไม่ได้');
      } finally {
        if (active) setLoading(false);
      }
    }

    function onAuthChange() {
      void check();
    }

    void check();
    window.addEventListener('storage', onAuthChange);
    window.addEventListener('dofree-auth-change', onAuthChange);

    return () => {
      active = false;
      window.removeEventListener('storage', onAuthChange);
      window.removeEventListener('dofree-auth-change', onAuthChange);
    };
  }, []);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030303] px-4 text-white">
        <p className="text-sm font-black text-white/50">{message}</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030303] px-4 text-white">
        <section className="w-full max-w-lg rounded-[32px] border border-white/10 bg-white/[0.045] p-6 text-center shadow-[0_0_70px_rgba(0,0,0,0.36)]">
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[#e50914]">Secure Access</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.06em]">ต้องเข้าสู่ระบบก่อน</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/50">{message}</p>
          <div className="mt-6 flex justify-center gap-3">
            <a href="/auth?mode=signin&next=/admin" className="rounded-2xl bg-[#e50914] px-5 py-3 text-sm font-black text-white shadow-glow">
              เข้าสู่ระบบ
            </a>
            <a href="/" className="rounded-2xl bg-white/[0.08] px-5 py-3 text-sm font-black text-white/72">
              กลับหน้าแรก
            </a>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
