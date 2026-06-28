'use client';

import { useEffect, useMemo, useState } from 'react';
import { BackLink } from '@/components/back-link';
import { getStoredSession, sessionMembershipState, type DofreeSession } from '@/lib/supabase-auth-browser';

const plans = [
  {
    name: 'Free',
    price: 'ฟรี',
    desc: 'สำหรับผู้ใช้ทั่วไปที่ต้องการดูข้อมูลหนัง ค้นหา และเปิดรายละเอียดคอนเทนต์',
    items: ['ดูข้อมูลหนังและซีรีส์', 'ค้นหาและกรองรายการ', 'ดูนักแสดงในหน้ารายละเอียด'],
  },
  {
    name: 'Premium',
    price: 'พรีเมียม',
    desc: 'สำหรับสมาชิกที่ต้องการประสบการณ์เต็มขึ้น พร้อมฟีเจอร์ส่วนตัวและการใช้งานต่อเนื่อง',
    items: [
      'เก็บรายการโปรด',
      'ดูต่อและประวัติ',
      'แจ้งเตือนหนังใหม่',
      'จัดการสมาชิก',
      'กดดูผลงานทั้งหมดจากนักแสดงได้',
    ],
  },
];

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function MembershipPage() {
  const [session, setSession] = useState<DofreeSession | null>(null);

  useEffect(() => {
    function syncSession() {
      setSession(getStoredSession());
    }

    syncSession();
    window.addEventListener('storage', syncSession);
    window.addEventListener('dofree-auth-change', syncSession);
    return () => {
      window.removeEventListener('storage', syncSession);
      window.removeEventListener('dofree-auth-change', syncSession);
    };
  }, []);

  const state = useMemo(() => sessionMembershipState(session), [session]);
  const userLabel = session?.profile?.display_name || session?.user?.email || session?.user?.phone || '';
  const statusText = !state.isSignedIn
    ? 'เลือกแผนที่เหมาะกับคุณ หรือเข้าสู่ระบบเพื่อสมัคร Premium'
    : state.hasPremiumAccess
      ? `คุณเป็นสมาชิก Premium${state.premiumUntil ? ` ใช้งานได้ถึง ${formatDate(state.premiumUntil)}` : ''}`
      : 'คุณกำลังใช้งานแผน Free';

  return (
    <main className="min-h-screen bg-[#030303] px-4 py-24 text-white md:px-8">
      <BackLink />
      <section className="mx-auto max-w-5xl">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#e50914]/85">Membership</p>
        <h1 className="mt-3 text-[36px] font-black tracking-[-0.07em] md:text-[64px]">สมัครสมาชิก</h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/48 md:text-base">
          {statusText}
        </p>
        {userLabel ? (
          <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full bg-white/[0.075] px-4 py-2 text-xs font-black text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <span className="truncate">{userLabel}</span>
            <span className={`rounded-full px-2 py-1 text-[10px] ${state.hasPremiumAccess ? 'bg-[#f4c46b] text-black' : 'bg-white/[0.10] text-white/72'}`}>
              {state.hasPremiumAccess ? 'Premium' : 'Free'}
            </span>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {plans.map((plan) => {
            const isFree = plan.name === 'Free';
            const current = state.isSignedIn && (isFree ? !state.hasPremiumAccess : state.hasPremiumAccess);
            const ctaLabel = isFree
              ? state.isSignedIn ? 'แผน Free' : 'เริ่มใช้ฟรี'
              : state.hasPremiumAccess ? 'แผนปัจจุบัน' : state.isSignedIn ? 'อัปเกรดเป็น Premium' : 'เข้าสู่ระบบเพื่อสมัคร Premium';
            const ctaHref = isFree ? '/' : state.isSignedIn ? '#premium' : '/auth?mode=signin';

            return (
              <article id={isFree ? 'free' : 'premium'} key={plan.name} className={`relative overflow-hidden rounded-[30px] bg-white/[0.045] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl ${!isFree ? 'border border-[#f4c46b]/24' : 'border border-white/[0.07]'}`}>
                {current ? <span className="absolute right-4 top-4 rounded-full bg-[#e50914] px-3 py-1 text-[10px] font-black text-white shadow-glow">แผนปัจจุบัน</span> : null}
                <h2 className="text-2xl font-black tracking-[-0.05em]">{plan.name}</h2>
                <p className={`mt-1 text-xl font-black ${isFree ? 'text-white/72' : 'text-[#f4c46b]'}`}>{plan.price}</p>
                <p className="mt-3 min-h-[58px] text-sm font-semibold leading-6 text-white/48">{plan.desc}</p>
                <div className="mt-5 grid gap-2">
                  {plan.items.map((item) => (
                    <div key={item} className={`rounded-2xl px-4 py-3 text-sm font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${!isFree && !state.hasPremiumAccess ? 'bg-black/35 text-white/48' : 'bg-black/35 text-white/72'}`}>
                      {!isFree && !state.hasPremiumAccess ? <span className="mr-2 rounded bg-[#f4c46b] px-1.5 py-0.5 text-[9px] font-black text-black">Premium</span> : null}
                      {item}
                    </div>
                  ))}
                </div>
                <a href={ctaHref} className={`mt-5 inline-flex h-12 w-full items-center justify-center rounded-[20px] text-sm font-black transition ${isFree ? 'bg-white/[0.08] text-white/74 hover:bg-white/[0.12] hover:text-white' : 'bg-[#e50914] text-white shadow-glow hover:scale-[1.01]'}`}>
                  {ctaLabel}
                </a>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
