'use client';

import { useEffect, useState } from 'react';
import { AdminAuthGuard } from '@/components/admin-auth-guard';
import { getValidSession } from '@/lib/supabase-auth-browser';

type SiteFeaturesResponse = {
  ok?: boolean;
  settings?: {
    homeClipsEnabled?: boolean;
  };
  error?: string;
};

export default function AdminFeatureSettingsPage() {
  const [homeClipsEnabled, setHomeClipsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function authToken() {
    const session = await getValidSession();
    if (!session?.access_token) throw new Error('ต้องเข้าสู่ระบบแอดมินใหม่');
    return session.access_token;
  }

  async function loadSettings() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/site-features', { cache: 'no-store' });
      const payload = await response.json() as SiteFeaturesResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'โหลดการตั้งค่าไม่ได้');
      setHomeClipsEnabled(payload.settings?.homeClipsEnabled !== false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดการตั้งค่าไม่ได้');
    } finally {
      setLoading(false);
    }
  }

  async function saveHomeClips(nextValue: boolean) {
    setSaving(true);
    setMessage('');
    try {
      const token = await authToken();
      const response = await fetch('/api/site-features', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ homeClipsEnabled: nextValue }),
      });
      const payload = await response.json() as SiteFeaturesResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'บันทึกการตั้งค่าไม่ได้');
      setHomeClipsEnabled(payload.settings?.homeClipsEnabled !== false);
      setMessage(nextValue ? 'เปิดการแสดงผลชุดคลิปหน้าแรกแล้ว' : 'ปิดการแสดงผลชุดคลิปหน้าแรกแล้ว');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกการตั้งค่าไม่ได้');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  return (
    <AdminAuthGuard>
      <main className="min-h-screen bg-[#050505] px-4 py-5 text-white md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl space-y-5">
          <section className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(229,9,20,0.24),transparent_24rem),rgba(255,255,255,0.04)] p-5 shadow-[0_30px_110px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.08)] md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ff3b45]">Feature Settings</p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.055em] md:text-5xl">ตั้งค่าการแสดงผลหน้าเว็บ</h1>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/58 md:text-base">เปิด/ปิดชุดคอนเทนต์ที่แสดงบนหน้าบ้านโดยไม่ต้องลบข้อมูล</p>
              </div>
              <div className="flex gap-2">
                <a href="/admin" className="inline-flex h-11 items-center rounded-2xl bg-white/[0.10] px-5 text-xs font-black text-white/76 ring-1 ring-white/10 hover:bg-white/[0.16] hover:text-white">กลับแอดมิน</a>
                <a href="/" target="_blank" className="inline-flex h-11 items-center rounded-2xl bg-[#e50914] px-5 text-xs font-black text-white shadow-[0_14px_34px_rgba(229,9,20,0.28)]">ดูหน้าแรก</a>
              </div>
            </div>
          </section>

          {message ? <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-white/78">{message}</div> : null}

          <section className="rounded-[26px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_22px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.06)] md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#ff3b45]">Homepage Clips Block</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">ชุด “ไม่รู้จะดูอะไรดี?”</h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/52">
                  ควบคุมการแสดงผลชุด Coming Soon / Clips บนหน้าแรก ทั้งการ์ดตัวอย่างและคลิปจริงที่ตั้งค่า show_home ไว้
                </p>
                <p className="mt-2 text-xs font-bold text-white/34">สถานะปัจจุบัน: {loading ? 'กำลังโหลด...' : homeClipsEnabled ? 'เปิดแสดงผล' : 'ปิดการแสดงผล'}</p>
              </div>
              <button
                type="button"
                disabled={loading || saving}
                onClick={() => void saveHomeClips(!homeClipsEnabled)}
                className={`h-12 shrink-0 rounded-2xl px-6 text-sm font-black text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)] ring-1 disabled:cursor-not-allowed disabled:opacity-50 ${homeClipsEnabled ? 'bg-[#e50914] ring-[#e50914]/35' : 'bg-white/[0.10] ring-white/10'}`}
              >
                {saving ? 'กำลังบันทึก...' : homeClipsEnabled ? 'ปิดชุดนี้' : 'เปิดชุดนี้'}
              </button>
            </div>
          </section>
        </div>
      </main>
    </AdminAuthGuard>
  );
}
