import { BackLink } from '@/components/back-link';
import { AuthPanel } from '@/components/auth-panel';

export default function AuthPage() {
  return (
    <main className="min-h-screen bg-[#030303] px-4 py-20 text-white md:px-8 md:py-24">
      <BackLink />
      <section className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[1fr_460px] md:items-start">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.55)] md:p-10">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#e50914]/85">ดูดีดี.online</p>
          <h1 className="mt-3 text-[34px] font-black tracking-[-0.07em] md:text-[62px]">บัญชีผู้ใช้ดูดีดี.online</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/48 md:text-base">
            เข้าสู่ระบบหรือสมัครสมาชิกเพื่อบันทึกรายการโปรด ประวัติการรับชม และจัดการสถานะสมาชิกของคุณ
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {[
              ['รายการโปรด', 'บันทึกหนังที่อยากดูไว้ในบัญชี'],
              ['ประวัติการรับชม', 'กลับมาดูเรื่องเดิมหรือดูต่อได้สะดวก'],
              ['สถานะสมาชิก', 'ตรวจสอบสิทธิ์ Free และ Premium'],
              ['ระบบดูดีดี.online', 'สื่อสารอย่างเป็นทางการในนามเว็บไซต์'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl bg-white/[0.07] px-4 py-4 text-left">
                <p className="text-sm font-black text-white/82">{title}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-white/42">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <AuthPanel />
      </section>
    </main>
  );
}
