'use client';

const capabilities = ['Next.js App Router', 'TMDB Catalog', 'Admin Workflow', 'Auth-ready', 'SEO Structure', 'Responsive Rails'];

const audienceCards = [
  {
    eyebrow: 'Hiring Signal',
    title: 'เห็น product thinking จากระบบที่ใช้งานได้จริง',
    body: 'หน้าแรกสื่อสารทั้ง UI craft, data flow, search/filter, detail window, admin surface และ metadata structure เพื่อให้ประเมินคุณภาพงานได้เร็วขึ้น',
  },
  {
    eyebrow: 'Client Value',
    title: 'ต่อยอดเป็นเว็บคอนเทนต์หรือแคมเปญแบรนด์ได้',
    body: 'โครงสร้างรองรับ catalog, membership, watch-ready list และ CMS workflow โดยยังคุมภาพลักษณ์ minimal, dark และ premium',
  },
  {
    eyebrow: 'Partner Ready',
    title: 'แยกส่วนพอสำหรับทำงานร่วมกับทีมอื่น',
    body: 'data layer, API route, admin module และ presentation component ถูกจัดเป็นสัดส่วน ช่วยให้ต่อ integration หรือ scale ทีมได้ง่ายกว่าเว็บหน้าเดียวทั่วไป',
  },
  {
    eyebrow: 'Learning Path',
    title: 'อ่านต่อได้ทั้ง UX, performance และ SEO',
    body: 'เหมาะสำหรับดู pattern ของ App Router, lazy rail rendering, responsive grid, metadata และ client interaction ที่อยู่ใน product context จริง',
  },
];

export function HomeProjectOverview() {
  return (
    <section className="border-y border-white/[0.07] bg-[#050505] px-4 py-8 md:px-7 md:py-12">
      <div className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#e50914]/85">Production Portfolio</p>
          <h2 className="mt-3 text-[30px] font-black leading-[0.95] tracking-[-0.07em] md:text-[56px]">
            เว็บหนังโทนพรีเมียมที่โชว์ทั้งหน้าบ้านและระบบหลังบ้าน
          </h2>
          <p className="mt-4 text-sm font-semibold leading-7 text-white/52 md:text-base">
            DOFree v3 ถูกจัดให้เป็นตัวอย่าง production Next.js ที่มีประสบการณ์ผู้ใช้จริง ค้นหาได้ จัดหมวดได้ มีเส้นทางสมาชิก และพร้อมต่อยอดเป็นระบบคอนเทนต์เต็มรูปแบบ
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {capabilities.map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-[11px] font-black text-white/60">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {audienceCards.map((card) => (
            <article
              key={card.eyebrow}
              className="rounded-[24px] border border-white/[0.09] bg-white/[0.045] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.065]"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#f6c56b]">{card.eyebrow}</p>
              <h3 className="mt-3 text-xl font-black tracking-[-0.045em] text-white">{card.title}</h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/50">{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
