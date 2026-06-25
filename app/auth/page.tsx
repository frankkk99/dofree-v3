import { AuthPanel } from '@/components/auth-panel';

export default function AuthPage() {
  return (
    <main className="min-h-screen bg-[#030303] px-4 py-24 text-white md:px-8">
      <section className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[1fr_440px] md:items-start">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.55)] md:p-10">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#e50914]/85">Auth Center</p>
          <h1 className="mt-3 text-[36px] font-black tracking-[-0.07em] md:text-[64px]">เข้าสู่ระบบ / สมัครสมาชิก</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/48 md:text-base">
            เริ่มใช้บัญชี DOFree เพื่อเก็บรายการโปรด ดูประวัติการรับชม ใช้สถานะสมาชิก และต่อระบบ Admin role ในขั้นถัดไป
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {['Google OAuth', 'LINE Login', 'Email + Password', 'Phone OTP'].map((item) => (
              <div key={item} className="rounded-2xl bg-white/[0.07] px-4 py-4 text-left text-sm font-black text-white/78">
                {item}
              </div>
            ))}
          </div>
        </div>

        <AuthPanel />
      </section>
    </main>
  );
}
