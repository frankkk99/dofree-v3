import { BackLink } from '@/components/back-link';
import { AuthPanel } from '@/components/auth-panel';

export default function AuthPage() {
  return (
    <main className="min-h-screen bg-[#030303] px-4 py-24 text-white md:px-8">
      <BackLink />
      <section className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[1fr_440px] md:items-start">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.55)] md:p-10">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#e50914]/85">Dodeedee Account</p>
          <h1 className="mt-3 text-[36px] font-black tracking-[-0.07em] md:text-[64px]">บัญชีดูดีดี.online</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/48 md:text-base">
            เข้าสู่ระบบหรือสมัครสมาชิกด้วยอีเมล เพื่อเก็บรายการโปรด ดูประวัติการรับชม และใช้งานฟีเจอร์สมาชิกได้สะดวกขึ้นในที่เดียว
          </p>
          <div className="mt-8 rounded-[26px] border border-white/10 bg-black/28 p-5">
            <p className="text-sm font-black text-white">การเข้าสู่ระบบด้วยอีเมลเป็นวิธีหลักที่พร้อมใช้งาน</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/48">
              ช่องทางเข้าสู่ระบบอื่นจะแสดงเป็น “เร็ว ๆ นี้” จนกว่าจะเปิดใช้งานจริง เพื่อให้ผู้ใช้ไม่กดไปเจอหน้าที่ยังไม่พร้อม
            </p>
          </div>
        </div>

        <AuthPanel />
      </section>
    </main>
  );
}
