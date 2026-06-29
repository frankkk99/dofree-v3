'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  consumeAuthRedirectFromUrl,
  getCurrentUser,
  getStoredSession,
  resendConfirmationEmail,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  type DofreeUser,
} from '@/lib/supabase-auth-browser';

type AuthMode = 'signin' | 'signup';

const authSuccessKey = 'dofree_auth_success';

const otherLoginMethods = ['Google', 'LINE', 'Facebook', 'Apple', 'เบอร์โทร'];

function initialMode(): AuthMode {
  if (typeof window === 'undefined') return 'signin';
  const params = new URLSearchParams(window.location.search);
  return params.get('mode') === 'signup' ? 'signup' : 'signin';
}

function redirectTarget() {
  if (typeof window === 'undefined') return '/';
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next') || '/';
  if (!next.startsWith('/') || next.startsWith('//')) return '/';
  return next;
}

function isAdminEntry() {
  return redirectTarget().startsWith('/admin');
}

function confirmedHint() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return params.get('confirmed') ? 'ยืนยันอีเมลเรียบร้อยแล้ว กำลังตรวจสอบบัญชีให้คุณ' : '';
}

function markAuthSuccessAndRedirect(next: string) {
  window.sessionStorage.setItem(authSuccessKey, 'signin');
  window.location.assign(next || '/');
}

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<DofreeUser | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const hint = useMemo(() => confirmedHint(), []);
  const next = useMemo(() => redirectTarget(), []);
  const adminEntry = useMemo(() => isAdminEntry(), []);

  useEffect(() => {
    setMode(initialMode());
    const session = getStoredSession();
    setUser(session?.user || null);

    async function boot() {
      try {
        const redirectSession = await consumeAuthRedirectFromUrl();
        if (redirectSession?.user) {
          setUser(redirectSession.user);
          setNeedsConfirmation(false);
          markAuthSuccessAndRedirect(next);
          return;
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ');
      }

      await getCurrentUser().then((currentUser) => {
        setUser(currentUser);
      }).catch(() => null);
    }

    void boot();
  }, [next]);

  async function submit() {
    setLoading(true);
    setMessage('');
    setNeedsConfirmation(false);

    try {
      if (!email.trim() || !password.trim()) throw new Error('กรอกอีเมลและรหัสผ่านก่อน');
      if (password.length < 6) throw new Error('รหัสผ่านควรมีอย่างน้อย 6 ตัวอักษร');

      const session = mode === 'signin'
        ? await signInWithEmail(email.trim(), password)
        : await signUpWithEmail(email.trim(), password);

      if (session?.user) {
        setUser(session.user);
        setMessage(mode === 'signin' ? 'เข้าสู่ระบบสำเร็จ' : 'สมัครสมาชิกสำเร็จ');
        markAuthSuccessAndRedirect(next);
        return;
      }

      setNeedsConfirmation(true);
      setMessage('สมัครสมาชิกแล้ว โปรดเช็กอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
      setMessage(text);
      if (text.toLowerCase().includes('confirm') || text.toLowerCase().includes('not confirmed')) {
        setNeedsConfirmation(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setLoading(true);
    setMessage('');

    try {
      if (!email.trim()) throw new Error('กรอกอีเมลก่อนส่งลิงก์ยืนยันใหม่');
      await resendConfirmationEmail(email.trim());
      setNeedsConfirmation(true);
      setMessage('ส่งอีเมลยืนยันใหม่แล้ว โปรดตรวจสอบกล่องจดหมายของคุณ');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ส่งอีเมลยืนยันใหม่ไม่ได้');
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    await signOut();
    setUser(null);
    setMessage('ออกจากระบบแล้ว');
    setLoading(false);
  }

  return (
    <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.55)] md:p-7">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e50914]/85">Account</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">เข้าสู่ระบบด้วยอีเมล</h2>
        <p className="mt-2 text-xs font-semibold leading-5 text-white/48">ใช้บัญชีดูดีดี.online เพื่อเก็บรายการโปรด ดูประวัติ และใช้งานฟีเจอร์สมาชิก</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`rounded-2xl px-4 py-3 text-sm font-black ${mode === 'signin' ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/70'}`}
        >
          เข้าสู่ระบบ
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`rounded-2xl px-4 py-3 text-sm font-black ${mode === 'signup' ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/70'}`}
        >
          สมัครสมาชิก
        </button>
      </div>

      {adminEntry ? <p className="mt-4 rounded-2xl bg-[#e50914]/10 px-4 py-3 text-xs font-bold text-red-100/70">เข้าสู่ระบบเพื่อดำเนินการต่อ</p> : null}
      {hint ? <p className="mt-4 rounded-2xl bg-white/[0.055] px-4 py-3 text-xs font-bold text-white/52">{hint}</p> : null}

      {user ? (
        <div className="mt-5 rounded-[24px] border border-[#e50914]/25 bg-[#170203]/55 p-4">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#e50914]/85">Signed in</p>
          <p className="mt-2 break-all text-sm font-black text-white">{user.email || user.phone || user.id}</p>
          <div className="mt-4 grid gap-2">
            <a href={next || '/'} className="h-12 rounded-2xl bg-[#e50914] px-5 py-3 text-center text-sm font-black text-white shadow-glow">
              กลับหน้าแรก
            </a>
            <button
              type="button"
              onClick={logout}
              disabled={loading}
              className="h-12 rounded-2xl bg-white/[0.1] text-sm font-black text-white/78 hover:bg-white/[0.16] disabled:opacity-50"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          <label className="grid gap-1.5">
            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="you@example.com"
              className="h-12 rounded-2xl border border-white/10 bg-black/45 px-4 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-[#e50914]"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="อย่างน้อย 6 ตัวอักษร"
              className="h-12 rounded-2xl border border-white/10 bg-black/45 px-4 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-[#e50914]"
            />
          </label>

          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="h-12 rounded-2xl bg-[#e50914] px-5 text-sm font-black text-white shadow-glow transition hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'กำลังดำเนินการ...' : mode === 'signin' ? 'เข้าสู่ระบบด้วยอีเมล' : 'สมัครสมาชิกด้วยอีเมล'}
          </button>

          {needsConfirmation ? (
            <button
              type="button"
              onClick={resend}
              disabled={loading}
              className="h-12 rounded-2xl bg-white/[0.09] px-5 text-sm font-black text-white/78 transition hover:bg-white/[0.14] disabled:opacity-50"
            >
              ส่งอีเมลยืนยันใหม่
            </button>
          ) : null}
        </div>
      )}

      <div className="mt-5 rounded-[24px] border border-white/10 bg-black/28 p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">วิธีเข้าสู่ระบบอื่น ๆ</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {otherLoginMethods.map((method) => (
            <button
              key={method}
              type="button"
              disabled
              className="flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-white/[0.055] px-4 py-2.5 text-left text-sm font-black text-white/38"
            >
              <span>{method}</span>
              <span className="rounded-full bg-white/[0.08] px-2 py-1 text-[10px] text-white/42">เร็ว ๆ นี้</span>
            </button>
          ))}
        </div>
      </div>

      {message ? <p className="mt-4 rounded-2xl bg-white/[0.055] px-4 py-3 text-xs font-bold text-white/60">{message}</p> : null}
    </div>
  );
}
