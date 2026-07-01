import type { Metadata } from 'next';
import { baseOpenGraph, indexRobots, safeDescription, siteName } from '@/lib/seo';

const featureCards = [
  {
    title: 'ค้นด้วยชื่อหนัง',
    desc: 'พิมพ์ชื่อไทย อังกฤษ หรือชื่อใกล้เคียง ระบบจะค้นจากฐานข้อมูลหนังและซีรีส์ในเว็บ',
    examples: ['Avatar', 'John Wick', 'ธี่หยด'],
  },
  {
    title: 'ค้นด้วยแนวหนัง',
    desc: 'ไม่ต้องจำชื่อเรื่อง แค่พิมพ์แนวที่อยากดู เช่น ผี แอ็กชัน โรแมนติก ตลก หรือไซไฟ',
    examples: ['หนังผี', 'แอ็กชันคะแนนดี', 'โรแมนติกเกาหลี'],
  },
  {
    title: 'ค้นด้วยประเทศและภาษา',
    desc: 'กรองหรือค้นหาคอนเทนต์ตามประเทศ ภาษา และสไตล์ที่ชอบได้ง่ายขึ้น',
    examples: ['หนังไทย', 'ซีรีส์จีน', 'หนังเกาหลีฆาตกรรม'],
  },
  {
    title: 'ค้นแบบภาษาคน',
    desc: 'พิมพ์ประโยคที่อยากดูได้ เช่น อารมณ์ เรื่องราว หรือสถานการณ์ที่ต้องการ',
    examples: ['หนังดูคืนนี้ไม่เครียด', 'หนังเอาชีวิตรอดในป่า', 'หนังคล้าย John Wick'],
  },
  {
    title: 'กรองผลลัพธ์',
    desc: 'ใช้ตัวกรองเพื่อจำกัดผลลัพธ์ตามหมวด ประเภท ประเทศ ภาษา ความชัด ปี และคะแนน',
    examples: ['คะแนนมาก→น้อย', 'ปีใหม่→เก่า', 'พร้อมดู'],
  },
  {
    title: 'ดูตัวอย่างก่อนเลือก',
    desc: 'ในหน้ารายละเอียดสามารถกดชมตัวอย่าง ดูเรื่องย่อ นักแสดง รายการแนะนำ และสถานะพร้อมรับชม',
    examples: ['ตัวอย่าง', 'เรื่องย่อ', 'แนะนำสำหรับคุณ'],
  },
];

const sampleQueries = [
  'หนังผีเกาหลีคะแนนดี',
  'หนังไทยตลก',
  'ซีรีส์จีนย้อนยุค',
  'หนังแอ็กชันปีใหม่',
  'หนังคล้าย John Wick',
  'หนังดูคืนนี้ไม่เครียด',
  'หนังเอาชีวิตรอด',
  'อนิเมะแฟนตาซี',
];

const faqItems = [
  {
    question: 'ต้องจำชื่อหนังให้ถูกไหม?',
    answer: 'ไม่จำเป็น ผู้ใช้สามารถค้นด้วยชื่อไทย ชื่ออังกฤษ แนวหนัง ประเทศ ภาษา หรือคำอธิบายสั้น ๆ ได้',
  },
  {
    question: 'ค้นหาแบบภาษาคนได้อย่างไร?',
    answer: 'พิมพ์ประโยคที่อธิบายสิ่งที่อยากดู เช่น หนังผีเกาหลีคะแนนดี หรือ หนังดูคืนนี้ไม่เครียด แล้วระบบจะค้นหารายการที่ใกล้เคียง',
  },
  {
    question: 'ถ้าไม่รู้จะดูอะไรควรเริ่มตรงไหน?',
    answer: 'เริ่มจากหน้า Search แล้วกดตัวอย่างคำค้น หรือเข้าไปดูหมวดพร้อมรับชม หมวดคะแนนสูง และหมวดตามประเทศ/แนวหนัง',
  },
  {
    question: 'เว็บนี้มีระบบอะไรบ้าง?',
    answer: 'มีระบบค้นหา หมวดหมู่ ตัวกรอง หน้าเรื่องพร้อมรับชม ตัวอย่าง เรื่องย่อ นักแสดง รายการแนะนำ รายการโปรด ประวัติ และเมนูสมาชิก',
  },
];

export const metadata: Metadata = {
  title: 'วิธีใช้งานเว็บและระบบค้นหาหนัง',
  description: safeDescription(`เรียนรู้วิธีใช้${siteName} ค้นหาหนัง ซีรีส์ หมวดหมู่ ตัวกรอง คำค้นแบบภาษาคน รายการโปรด ประวัติ และระบบแนะนำคอนเทนต์`),
  alternates: { canonical: '/how-to-use' },
  openGraph: {
    ...baseOpenGraph('/how-to-use'),
    title: `วิธีใช้งานเว็บ | ${siteName}`,
    description: `ดูว่า${siteName}ค้นหาและช่วยเลือกหนังได้อย่างไร`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `วิธีใช้งานเว็บ | ${siteName}`,
    description: `เรียนรู้ระบบค้นหา หมวดหมู่ ตัวกรอง และตัวอย่างคำค้นบน${siteName}`,
  },
  robots: indexRobots(),
};

export default function HowToUsePage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-[#030303] pb-[calc(9rem+env(safe-area-inset-bottom))] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <section className="relative overflow-hidden border-b border-white/10 px-4 py-16 md:px-6 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(229,9,20,0.24),transparent_28rem),linear-gradient(180deg,#090101,#030303)]" />
        <div className="relative z-10 mx-auto max-w-[1180px]">
          <a href="/" className="inline-flex rounded-full bg-white/[0.06] px-3 py-2 text-xs font-black text-red-100/80 hover:bg-white/[0.10] hover:text-white md:text-sm">← กลับหน้าแรก</a>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.34em] text-[#e50914]">How to use</p>
          <h1 className="mt-3 max-w-4xl text-5xl font-black tracking-[-0.08em] md:text-7xl">เว็บนี้ทำอะไรได้บ้าง</h1>
          <p className="mt-5 max-w-3xl text-sm font-bold leading-7 text-white/58 md:text-lg md:leading-8">
            {siteName} ออกแบบมาให้ค้นหาหนังและซีรีส์ได้มากกว่าการพิมพ์ชื่อเรื่อง ผู้ใช้สามารถค้นด้วยแนวหนัง ประเทศ ภาษา คะแนน ปี หรือประโยคแบบภาษาคนได้
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <a href="/search" className="rounded-full bg-[#e50914] px-5 py-3 text-xs font-black text-white shadow-glow">เริ่มค้นหา</a>
            <a href="/watch-ready" className="rounded-full bg-white/[0.09] px-5 py-3 text-xs font-black text-white/72 hover:bg-white/[0.14] hover:text-white">ดูเรื่องพร้อมรับชม</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 py-8 md:px-6 md:py-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]/80">Capabilities</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] md:text-4xl">ระบบหลักที่ผู้ใช้ควรรู้</h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((card) => (
            <article key={card.title} className="rounded-[28px] border border-white/8 bg-white/[0.045] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_22px_70px_rgba(0,0,0,0.28)]">
              <h3 className="text-lg font-black tracking-[-0.04em] text-white">{card.title}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/50">{card.desc}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {card.examples.map((example) => (
                  <a key={example} href={`/search?q=${encodeURIComponent(example)}`} className="rounded-full bg-black/35 px-3 py-1.5 text-[10px] font-black text-white/54 hover:bg-[#e50914] hover:text-white">{example}</a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 pb-8 md:px-6">
        <div className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(229,9,20,0.18),transparent_24rem),rgba(255,255,255,0.045)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]/80">Example queries</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] md:text-4xl">ลองค้นหาแบบนี้ได้</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/48">กดตัวอย่างเพื่อเริ่มค้นหา ระบบจะส่งไปที่หน้า Search พร้อมคำค้นนั้นทันที</p>
            </div>
            <a href="/search" className="rounded-full bg-[#e50914] px-5 py-3 text-center text-xs font-black text-white shadow-glow">เปิดหน้า Search</a>
          </div>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
            {sampleQueries.map((query) => (
              <a key={query} href={`/search?q=${encodeURIComponent(query)}`} className="shrink-0 rounded-full bg-white/[0.08] px-4 py-2.5 text-xs font-black text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/[0.14] hover:text-white">{query}</a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 pb-12 md:px-6">
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]/80">FAQ</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] md:text-4xl">คำถามที่พบบ่อย</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {faqItems.map((item) => (
            <article key={item.question} className="rounded-[24px] bg-white/[0.045] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <h3 className="text-base font-black text-white/88">{item.question}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/48">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
