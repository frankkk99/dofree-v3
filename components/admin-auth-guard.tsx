'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getValidSession, hydrateStoredSession, signOut } from '@/lib/supabase-auth-browser';

type ProfileResponse = {
  ok?: boolean;
  role?: string;
  roleLabel?: string;
  isAdmin?: boolean;
  error?: string;
};

function currentAdminNext() {
  if (typeof window === 'undefined') return '/admin';
  return `${window.location.pathname}${window.location.search}` || '/admin';
}

function authHref() {
  return `/auth?mode=signin&next=${encodeURIComponent(currentAdminNext())}`;
}

export function AdminAuthGuard({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState('กำลังตรวจสอบสิทธิ์บัญชี...');
  const [signinHref, setSigninHref] = useState('/auth?mode=signin&next=/admin');
  const checkingRef = useRef(false);
  const checkedTokenRef = useRef('');
  const hasResolvedOnceRef = useRef(false);

  useEffect(() => {
    let active = true;
    let authTimer: number | null = null;

    async function check(force = false) {
      if (checkingRef.current) return;
      checkingRef.current = true;
      if (!hasResolvedOnceRef.current) setLoading(true);
      setSigninHref(authHref());

      const session = await hydrateStoredSession().catch(() => null) || await getValidSession().catch(() => null);
      const token = session?.access_token;

      if (!token) {
        if (!active) return;
        checkedTokenRef.current = '';
        setIsAdmin(false);
        setMessage('เข้าสู่ระบบเพื่อดำเนินการต่อ');
        setLoading(false);
        hasResolvedOnceRef.current = true;
        checkingRef.current = false;
        return;
      }

      if (!force && checkedTokenRef.current === token && hasResolvedOnceRef.current) {
        checkingRef.current = false;
        return;
      }

      try {
        const response = await fetch('/api/profile/me', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const payload = (await response.json()) as ProfileResponse;
        if (!active) return;

        if (response.status === 401) {
          await signOut();
          checkedTokenRef.current = '';
          setIsAdmin(false);
          setMessage('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
          return;
        }

        const allowed = Boolean(response.ok && payload.ok && payload.isAdmin);
        checkedTokenRef.current = token;
        setIsAdmin(allowed);
        setMessage(allowed ? `พร้อมใช้งาน${payload.roleLabel ? ` · ${payload.roleLabel}` : ''}` : 'บัญชีนี้ไม่มีสิทธิ์เข้าพื้นที่นี้');
      } catch {
        if (!active) return;
        setIsAdmin(false);
        setMessage('ตรวจสอบสิทธิ์บัญชีไม่ได้');
      } finally {
        checkingRef.current = false;
        hasResolvedOnceRef.current = true;
        if (active) setLoading(false);
      }
    }

    function queueCheck(force = false) {
      if (authTimer) window.clearTimeout(authTimer);
      authTimer = window.setTimeout(() => void check(force), 160);
    }

    function onStorage() {
      queueCheck(true);
    }

    function onAuthChange() {
      queueCheck(true);
    }

    function onFocus() {
      queueCheck(false);
    }

    void check(true);
    window.addEventListener('storage', onStorage);
    window.addEventListener('dofree-auth-change', onAuthChange);
    window.addEventListener('focus', onFocus);

    return () => {
      active = false;
      if (authTimer) window.clearTimeout(authTimer);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('dofree-auth-change', onAuthChange);
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <main className="admin-shell grid min-h-screen place-items-center px-4 text-white">
        <p className="admin-floating-glass rounded-2xl px-5 py-4 text-sm font-black text-white/88">{message}</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="admin-shell grid min-h-screen place-items-center px-4 text-white">
        <section className="admin-floating-glass w-full max-w-lg rounded-[28px] border border-white/10 p-6 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[#e50914]">Secure Access</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.06em]">ต้องเข้าสู่ระบบก่อน</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/78">{message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href={signinHref} className="rounded-2xl bg-[#e50914] px-5 py-3 text-sm font-black text-white shadow-glow">
              เข้าสู่ระบบ
            </a>
            <button type="button" onClick={() => void signOut()} className="rounded-2xl bg-white/[0.08] px-5 py-3 text-sm font-black text-white/72">
              ล้างเซสชัน
            </button>
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
