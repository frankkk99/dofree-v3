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

function initialMode(): AuthMode {
  if (typeof window === 'undefined') return 'signin';
  const params = new URLSearchParams(window.location.search);
  return params.get('mode') === 'signup' ? 'signup' : 'signin';
}

function methodHint() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const provider = params.get('provider');
  const method = params.get('method');
  const confirmed = params.get('confirmed');
  if (confirmed) return 'ยืนยันอีเมลแล้ว ระบบกำลังผูกบัญชีให้';
  if (provider) return `เลือก ${provider} ไว้แล้ว — ขั้นต่อไปจะต่อ OAuth จริง`;
  if (method === 'phone') return 'เลือกเบอร์โทรไว้แล้ว — ขั้นต่อไปจะต่อ Phone OTP';
  if (method === 'email') return 'เลือก Email ไว้แล้ว — ใช้ฟอร์มด้านล่างได้เลย';
  return '';
}

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<DofreeUser | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const hint = useMemo(() => methodHint(), []);

  useEffect(() => {
    setMode(initialMode());
    const session = getStoredSession();
    setUser(session?.user || null);

    async function boot() {
      try {
        const redirectSession = await consumeAuthRedirectFromUrl();
        if (redirectSession?.user) {
          setUser(redirectSession.user);
          setMessage('ยืนยันอีเมลและเข้าสู่ระบบสำเร็จ');
          setNeedsConfirmation(false);
          return;
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ');
      }

      await getCurrentUser().then(setUser).catch(() => null);
    }

    void boot();
  }, []);

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
      } else {
        setNeedsConfirmation(true);
        setMessage('สมัครแล้ว โปรดเช็กอีเมลเพื่อยืนยันบัญชี ก่อนกลับมา Sign in');
      }
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
      setMessage('ส่งอีเมลยืนยันใหม่แล้ว ลิงก์รอบนี้จะกลับมาที่เว็บจริง ไม่ใช่ localhost');
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
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`rounded-2xl px-4 py-3 text-sm font-black ${mode === 'signin' ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/70'}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`rounded-2xl px-4 py-3 text-sm font-black ${mode === 'signup' ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/70'}`}
        >
          Sign up
        </button>
      </div>

      {hint ? <p className="mt-4 rounded-2xl bg-white/[0.055] px-4 py-3 text-xs font-bold text-white/52">{hint}</p> : null}

      {user ? (
        <div className="mt-5 rounded-[24px] border border-[#e50914]/25 bg-[#170203]/55 p-4">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#e50914]/85">Signed in</p>
          <p className="mt-2 break-all text-sm font-black text-white">{user.email || user.phone || user.id}</p>
          <button
            type="button"
            onClick={logout}
            disabled={loading}
            className="mt-4 h-12 w-full rounded-2xl bg-white/[0.1] text-sm font-black text-white/78 hover:bg-white/[0.16] disabled:opacity-50"
          >
            Logout
          </button>
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
            className="h-[52px] rounded-2xl bg-[#e50914] px-5 py-4 text-sm font-black text-white shadow-glow transition hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'กำลังดำเนินการ...' : mode === 'signin' ? 'เข้าสู่ระบบด้วย Email' : 'สมัครสมาชิกด้วย Email'}
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

      {message ? <p className="mt-4 rounded-2xl bg-white/[0.055] px-4 py-3 text-xs font-bold text-white/60">{message}</p> : null}
    </div>
  );
}
