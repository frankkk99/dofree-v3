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
  const [message, setMessage] = useState('กำลังตรวจสอบสิทธิ์...');

  useEffect(() => {
    let active = true;

    async function check() {
      setLoading(true);
      const session = getStoredSession();
      const token = session?.access_token;

      if (!token) {
        if (!active) return;
        setIsAdmin(false);
        setMessage('ต้องเข้าสู่ระบบด้วยบัญชีแอดมินก่อน');
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
        setMessage(payload.isAdmin ? 'ผ่านสิทธิ์แอดมิน' : 'บัญชีนี้ไม่มีสิทธิ์แอดมิน');
      } catch {
        if (!active) return;
        setIsAdmin(false);
        setMessage('ตรวจสอบสิทธิ์ไม่ได้');
      } finally {
        if (active) setLoading(false);
      }
    }

    void check();
    return () => {
      active = false;
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
        <section className="w-full max-w-lg rounded-[32px] border border-[#e50914]/28 bg-[#170203]/70 p-6 text-center shadow-[0_0_70px_rgba(229,9,20,0.14)]">
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[#e50914]">Admin Only</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.06em]">ไม่มีสิทธิ์เข้าหลังบ้าน</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/50">{message}</p>
          <div className="mt-6 flex justify-center gap-3">
            <a href="/auth?mode=signin" className="rounded-2xl bg-[#e50914] px-5 py-3 text-sm font-black text-white shadow-glow">
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
