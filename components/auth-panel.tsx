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

const providers = [
  { id: 'google', label: 'Google', status: 'เร็ว ๆ นี้', enabled: false },
  { id: 'facebook', label: 'Facebook', status: 'เร็ว ๆ นี้', enabled: false },
  { id: 'apple', label: 'Apple', status: 'เร็ว ๆ นี้', enabled: false },
  { id: 'line', label: 'LINE', status: 'เร็ว ๆ นี้', enabled: false },
  { id: 'email', label: 'Email', status: 'ใช้งานได้', enabled: true },
  { id: 'phone', label: 'เบอร์โทร', status: 'เร็ว ๆ นี้', enabled: false },
];

function initialMode(): AuthMode {
  if (typeof window === 'undefined') return 'signin';
  const params = new URLSearchParams(window.location.search);
  return params.get('mode') === 'signup' ? 'signup' : 'signin';
}

function redirectTarget() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next') || '';
  if (!next.startsWith('/') || next.startsWith('//')) return '';
  return next;
}

function isAdminEntry() {
  return redirectTarget().startsWith('/admin');
}

function confirmationHint() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return params.get('confirmed') ? 'ยืนยันอีเมลแล้ว ระบบกำลังเข้าสู่บัญชีดูดีดี.online ให้คุณ' : '';
}

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<DofreeUser | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const hint = useMemo(() => confirmationHint(), []);
  const next = useMemo(() => redirectTarget(), []);
  const adminEntry = useMemo(() => isAdminEntry(), []);
  const title = mode === 'signin' ? 'เข้าสู่ระบบดูดีดี.online' : 'สมัครสมาชิกดูดีดี.online';

  useEffect(() => {
    setMode(initialMode());
    const session = getStoredSession();
    setUser(session?.user || null);

    async function boot() {
      try {
        const redirectSession = await consumeAuthRedirectFromUrl();
        if (redirectSession?.user) {
          setUser(redirectSession.user);
          setMessage('ยืนยันอีเมลและเข้าสู่ระบบดูดีดี.online สำเร็จ');
          setNeedsConfirmation(false);
          if (next) window.location.assign(next);
          return;
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ');
      }

      await getCurrentUser().then((currentUser) => {
        setUser(currentUser);
        if (currentUser && next) window.location.assign(next);
      }).catch(() => null);
    }

    void boot();
  }, [next]);

  async function submit() {
    setLoading(true);
    setMessage('');
    setNeedsConfirmation(false);

    try {
      if (!email.trim() || !password.trim()) throw new Error('กรุณากรอกอีเมลและรหัสผ่าน');
      if (password.length < 6) throw new Error('รหัสผ่านควรมีอย่างน้อย 6 ตัวอักษร');

      const session = mode === 'signin'
        ? await signInWithEmail(email.trim(), password)
        : await signUpWithEmail(email.trim(), password);

      if (session?.user) {
        setUser(session.user);
        setMessage(mode === 'signin' ? 'เข้าสู่ระบบดูดีดี.online สำเร็จ' : 'สมัครสมาชิกดูดีดี.online สำเร็จ');
        if (next) {
          window.location.assign(next);
          return;
        }
      } else {
        setNeedsConfirmation(true);
        setMessage('ระบบได้ส่งอีเมลยืนยันจากดูดีดี.online ไปยังอีเมลของคุณแล้ว กรุณาตรวจสอบกล่องจดหมายเพื่อเปิดใช้งานบัญชี');
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
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
      if (!email.trim()) throw new Error('กรุณากรอกอีเมลก่อนส่งอีเมลยืนยันอีกครั้ง');
      await resendConfirmationEmail(email.trim());
      setNeedsConfirmation(true);
      setMessage('ระบบได้ส่งอีเมลยืนยันจากดูดีดี.online อีกครั้งแล้ว กรุณาตรวจสอบกล่องจดหมายหรือโฟลเดอร์ Spam/Junk');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ส่งอีเมลยืนยันจากดูดีดี.online อีกครั้งไม่ได้');
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    await signOut();
    setUser(null);
    setMessage('ออกจากระบบบัญชีดูดีดี.online แล้ว');
    setLoading(false);
  }

  return (
    <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.55)] md:p-7">
      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#e50914]/85">DooDeeDee.online Account</p>
      <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">{title}</h2>
      <p className="mt-2 text-xs font-semibold leading-5 text-white/45">เลือกวิธีเข้าสู่ระบบ แล้วใช้อีเมลและรหัสผ่านสำหรับการใช้งานจริงในตอนนี้</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
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

      {adminEntry ? <p className="mt-4 rounded-2xl bg-[#e50914]/10 px-4 py-3 text-xs font-bold text-red-100/70">เข้าสู่ระบบดูดีดี.online เพื่อดำเนินการต่อ</p> : null}
      {hint ? <p className="mt-4 rounded-2xl bg-white/[0.055] px-4 py-3 text-xs font-bold text-white/52">{hint}</p> : null}

      {user ? (
        <div className="mt-5 rounded-[24px] border border-[#e50914]/25 bg-[#170203]/55 p-4">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#e50914]/85">Signed in</p>
          <p className="mt-2 break-all text-sm font-black text-white">{user.email || user.phone || user.id}</p>
          <div className="mt-4 grid gap-2">
            {next ? (
              <a href={next} className="h-12 rounded-2xl bg-[#e50914] px-5 py-3 text-center text-sm font-black text-white shadow-glow">
                ไปต่อ
              </a>
            ) : (
              <a href="/" className="h-12 rounded-2xl bg-[#e50914] px-5 py-3 text-center text-sm font-black text-white shadow-glow">
                กลับหน้าเว็บ
              </a>
            )}
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
          <div className="rounded-[24px] border border-white/10 bg-black/30 p-3">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-white/42">เลือกวิธีเข้าสู่ระบบ</p>
            <div className="grid grid-cols-2 gap-2">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  disabled={!provider.enabled}
                  onClick={() => provider.enabled ? setMessage('Email ใช้งานได้ กรุณากรอกอีเมลและรหัสผ่านด้านล่าง') : undefined}
                  className={`rounded-2xl px-3 py-3 text-left text-xs font-black transition ${provider.enabled ? 'bg-[#e50914] text-white shadow-glow' : 'cursor-not-allowed bg-white/[0.055] text-white/48'}`}
                >
                  <span className="block">{provider.label}</span>
                  <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] ${provider.enabled ? 'bg-white/20 text-white' : 'bg-white/[0.08] text-white/38'}`}>{provider.status}</span>
                </button>
              ))}
            </div>
          </div>

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
            className="h-13 rounded-2xl bg-[#e50914] px-5 py-4 text-sm font-black text-white shadow-glow transition hover:bg-red-600 disabled:opacity-50"
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
              ส่งอีเมลยืนยันจากดูดีดี.online อีกครั้ง
            </button>
          ) : null}
        </div>
      )}

      {message ? <p className="mt-4 rounded-2xl bg-white/[0.055] px-4 py-3 text-xs font-bold text-white/60">{message}</p> : null}
    </div>
  );
}
