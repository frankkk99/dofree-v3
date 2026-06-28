import { BackLink } from '@/components/back-link';
import { premiumFreeAccessStatus } from '@/lib/premium-access-config';
import { readPremiumFreeAccessConfig } from '@/lib/premium-access-store';

const plans = [
  {
    name: 'Free',
    price: 'ฟรี',
    desc: 'สำหรับผู้ใช้ทั่วไปที่ต้องการดูข้อมูลหนังและค้นหาเรื่องที่สนใจ',
    items: ['ดูหนัง', 'ค้นหาหนัง'],
  },
  {
    name: 'Premium',
    price: 'พรีเมียม',
    desc: 'สำหรับสมาชิกที่ต้องการประสบการณ์เต็มขึ้นและฟีเจอร์พิเศษ',
    items: [
      'ดูฟรีไม่มีโฆษณา',
      'ดูหมวดพิเศษ',
      'เก็บรายการโปรด',
      'ระบบดูย้อนหลัง',
      'ดูต่อ',
      'แจ้งเตือนหนังใหม่',
      'สปอยหนังจาก TikTok',
      'กดดูหนังผลงานจากนักแสดงได้',
    ],
  },
];

export default async function MembershipPage() {
  const premiumAccessConfig = await readPremiumFreeAccessConfig();
  const promoStatus = premiumFreeAccessStatus(premiumAccessConfig);
  const promoMessage = promoStatus === 'all'
    ? 'ตอนนี้เปิดฟีเจอร์ Premium ให้ผู้ใช้ Free ทดลองใช้งาน'
    : promoStatus === 'partial'
      ? 'ตอนนี้เปิดฟีเจอร์ Premium บางส่วนให้ทดลองใช้งาน'
      : '';

  return (
    <main className="min-h-screen bg-[#030303] px-4 py-24 text-white md:px-8">
      <BackLink />
      <section className="mx-auto max-w-5xl">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#e50914]/85">Membership</p>
        <h1 className="mt-3 text-[36px] font-black tracking-[-0.07em] md:text-[64px]">สมัครสมาชิก</h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/48 md:text-base">
          เลือกสิทธิ์การใช้งานที่เหมาะกับคุณ ระหว่าง Free สำหรับการดูและค้นหา กับ Premium สำหรับประสบการณ์เต็มแบบไม่มีโฆษณาและฟีเจอร์พิเศษ
        </p>

        {promoMessage ? (
          <div className="mt-6 rounded-[24px] border border-[#e50914]/25 bg-[#e50914]/12 px-5 py-4 shadow-[0_18px_70px_rgba(229,9,20,0.14)]">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-100/70">{premiumAccessConfig.label}</p>
            <p className="mt-2 text-sm font-black text-white md:text-base">{promoMessage}</p>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <article key={plan.name} className="rounded-[30px] bg-white/[0.045] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl">
              <h2 className="text-2xl font-black tracking-[-0.05em]">{plan.name}</h2>
              <p className="mt-1 text-xl font-black text-[#e50914]">{plan.price}</p>
              <p className="mt-3 min-h-[58px] text-sm font-semibold leading-6 text-white/48">{plan.desc}</p>
              <div className="mt-5 grid gap-2">
                {plan.items.map((item) => (
                  <div key={item} className="rounded-2xl bg-black/35 px-4 py-3 text-sm font-bold text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
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
