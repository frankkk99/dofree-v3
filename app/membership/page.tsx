import type { Metadata } from 'next';
import { BackLink } from '@/components/back-link';
import { publicPageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...publicPageMetadata({
    title: 'สมัครสมาชิกดูหนังออนไลน์',
    description: 'สมัครสมาชิกดูดีดีเพื่อเก็บรายการโปรด ดูประวัติการรับชม ติดตามหนังใหม่ และเตรียมใช้สิทธิ์ Premium สำหรับประสบการณ์ดูหนังออนไลน์ที่ครบขึ้น',
    path: '/membership',
    keywords: ['สมัครสมาชิกดูหนัง', 'สมาชิกดูหนังออนไลน์', 'Premium ดูหนัง'],
  }),
};

const plans = [
  {
    name: 'Free',
    price: 'ฟรี',
    desc: 'เหมาะกับผู้ใช้ทั่วไป ดูข้อมูลหนัง ค้นหา และเก็บรายการโปรด',
    items: ['ค้นหาหนังและซีรีส์', 'รายการโปรด', 'ประวัติการรับชมพื้นฐาน'],
  },
  {
    name: 'Premium',
    price: 'รายเดือน',
    desc: 'สำหรับสมาชิกที่ต้องการประสบการณ์เต็มขึ้นและสิทธิ์พิเศษ',
    items: ['ไม่มีโฆษณา', 'ดูต่อทุกอุปกรณ์', 'แจ้งเตือนหนังเข้าใหม่', 'โปรไฟล์ส่วนตัว'],
  },
  {
    name: 'Admin',
    price: 'หลังบ้าน',
    desc: 'สำหรับทีมดูแลเว็บและจัดการลิงก์รับชม',
    items: ['จัดการ catalog', 'import/export CSV', 'จัดการสถานะเผยแพร่'],
  },
];

export default function MembershipPage() {
  return (
    <main className="min-h-screen bg-[#030303] px-4 py-24 text-white md:px-8">
      <BackLink />
      <section className="mx-auto max-w-6xl">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#e50914]/85">Membership</p>
        <h1 className="mt-3 text-[36px] font-black tracking-[-0.07em] md:text-[64px]">สมัครสมาชิก</h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/48 md:text-base">
          โครงหน้านี้เตรียมไว้สำหรับต่อระบบสมาชิกจริง เช่น Premium, สิทธิ์ไม่มีโฆษณา, ดูต่อข้ามอุปกรณ์ และแยกสิทธิ์ Admin
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className="rounded-[30px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
              <h2 className="text-2xl font-black tracking-[-0.05em]">{plan.name}</h2>
              <p className="mt-1 text-xl font-black text-[#e50914]">{plan.price}</p>
              <p className="mt-3 min-h-[58px] text-sm font-semibold leading-6 text-white/48">{plan.desc}</p>
              <div className="mt-5 grid gap-2">
                {plan.items.map((item) => (
                  <div key={item} className="rounded-2xl bg-black/35 px-4 py-3 text-sm font-bold text-white/72">
                    {item}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
