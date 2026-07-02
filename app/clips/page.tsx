import type { Metadata } from 'next';

const categories = ['ทั้งหมด', 'Shorts', 'ตัวอย่าง', 'สรุปหนัง', 'สปอย', 'ฉากเด็ด', 'พากย์ไทย'];
const quickSearches = ['หนังผีเกาหลี', 'หนังรักดูง่าย', 'แอ็กชันมัน ๆ', 'ซีรีส์จีน', 'พากย์ไทย'];

const clipCards = [
  { tag: 'Shorts', title: 'คลิปสั้นก่อนเลือกดู', hint: 'ดูฟีลของเรื่องในเวลาสั้น ๆ', tone: 'from-[#e50914]/85 via-[#5b0b12]/75 to-black' },
  { tag: 'ตัวอย่าง', title: 'ตัวอย่างพากย์ไทย', hint: 'รู้โทนก่อนตัดสินใจ', tone: 'from-[#0ea5e9]/80 via-[#082f49]/75 to-black' },
  { tag: 'สรุปหนัง', title: 'สรุปเร็ว เข้าใจง่าย', hint: 'ช่วยเลือกเรื่องที่จะดู', tone: 'from-[#7c3aed]/80 via-[#2e1065]/75 to-black' },
  { tag: 'สปอย', title: 'คลิปมีคำเตือน', hint: 'เลือกดูเองเมื่อต้องการ', tone: 'from-[#f59e0b]/80 via-[#4a2505]/75 to-black' },
  { tag: 'ฉากเด็ด', title: 'ฉากที่ทำให้อยากดู', hint: 'คัดช่วงน่าสนใจไว้ก่อน', tone: 'from-[#10b981]/75 via-[#064e3b]/75 to-black' },
  { tag: 'รีวิวสั้น', title: 'รีวิวสั้นก่อนเลือก', hint: 'รู้แนว รู้ฟีล เลือกง่ายขึ้น', tone: 'from-[#f43f5e]/75 via-[#4c0519]/75 to-black' },
];

export const metadata: Metadata = {
  title: 'คลิปสั้นก่อนเลือกดู | ดูดีดี.online',
  description: 'ค้นหา Shorts ตัวอย่าง สรุปหนัง ฉากเด็ด และคลิปมีคำเตือน เพื่อช่วยเลือกเรื่องก่อนรับชมบนดูดีดี.online',
};

function ClipCard({ card, index }: { card: typeof clipCards[number]; index: number }) {
  return (
    <article className="relative aspect-[3/4] min-h-[188px] overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.045] shadow-[0_20px_70px_rgba(0,0,0,0.48)]">
      <div className={`absolute inset-0 bg-gradient-to-br ${card.tone}`} />
      <div className="absolute inset-0 scale-110 opacity-70 blur-xl">
        <div className="absolute left-4 top-5 h-24 w-20 rounded-full bg-white/20" />
        <div className="absolute bottom-6 right-4 h-28 w-24 rounded-full bg-[#e50914]/25" />
        <div className="absolute inset-x-5 top-24 h-24 rounded-[32px] bg-black/28" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06),rgba(0,0,0,0.16)_40%,rgba(0,0,0,0.92))]" />
      <div className="absolute left-2 top-2 rounded-full bg-black/52 px-2.5 py-1 text-[9px] font-black text-white/78 ring-1 ring-white/10 backdrop-blur-xl md:text-[10px]">{card.tag}</div>
      <div className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/[0.10] text-[10px] font-black text-white/58 backdrop-blur-xl">{index + 1}</div>
      <div className="absolute inset-x-[-18px] top-[42%] -rotate-12 bg-[#e50914]/92 py-2 text-center text-[10px] font-black tracking-[0.12em] text-white shadow-[0_14px_36px_rgba(229,9,20,0.28)]">เร็ว ๆ นี้</div>
      <div className="absolute inset-x-0 bottom-0 p-3 md:p-4">
        <h3 className="line-clamp-2 text-sm font-black leading-tight tracking-[-0.04em] text-white md:text-lg">{card.title}</h3>
        <p className="mt-1 line-clamp-2 text-[10px] font-bold leading-4 text-white/45 md:text-xs md:leading-5">{card.hint}</p>
      </div>
    </article>
  );
}

export default function ClipsPage() {
  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/88 px-4 py-3 backdrop-blur-2xl md:px-7 md:py-4">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
          <a href="/" className="text-xl font-black tracking-[-0.06em] text-[#e50914] md:text-3xl">ดูดีดี.online</a>
          <a href="/" className="rounded-full bg-white/[0.08] px-4 py-2 text-xs font-black text-white/68 transition hover:bg-white/[0.14] hover:text-white">กลับหน้าแรก</a>
        </div>
      </header>

      <section className="mx-auto max-w-[1440px] px-4 py-5 md:px-7 md:py-8">
        <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(229,9,20,0.20),transparent_24rem),rgba(255,255,255,0.04)] p-4 shadow-[0_28px_100px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] md:rounded-[34px] md:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e50914]/90">New Feature</p>
          <h1 className="mt-2 text-[30px] font-black leading-none tracking-[-0.07em] md:text-6xl">คลิปสั้นก่อนเลือกดู</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/56 md:text-base md:leading-7">เลือกแนวที่อยากดู แล้วดูคลิปสั้น ตัวอย่าง หรือสรุปก่อนตัดสินใจ</p>
          <div className="mt-4 rounded-[22px] bg-black/32 p-3 ring-1 ring-white/10">
            <div className="flex h-11 items-center gap-2 rounded-[16px] bg-white/[0.08] px-3 text-sm font-bold text-white/42 ring-1 ring-white/8 md:h-12">⌕ ค้นหาแนวที่อยากดู</div>
            <div className="movie-rail mt-2 flex gap-2 overflow-x-auto pb-1">
              {quickSearches.map((label) => <a key={label} href={`/search?q=${encodeURIComponent(label)}`} className="shrink-0 rounded-full bg-white/[0.08] px-3 py-2 text-[10px] font-black text-white/64 ring-1 ring-white/8">{label}</a>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-4 px-4 pb-10 md:grid-cols-[170px_1fr] md:px-7 md:pb-14">
        <aside className="md:sticky md:top-[82px] md:self-start">
          <div className="movie-rail flex gap-2 overflow-x-auto pb-1 md:grid md:gap-2 md:overflow-visible md:pb-0">
            {categories.map((label, index) => <a key={label} href="#" className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ring-1 transition md:w-full md:rounded-2xl md:px-4 md:py-3 md:text-left ${index === 0 ? 'bg-[#e50914] text-white ring-[#e50914]' : 'bg-white/[0.07] text-white/66 ring-white/10 hover:bg-white/[0.12] hover:text-white'}`}>{label}</a>)}
          </div>
        </aside>
        <div>
          <div className="mb-3 flex items-end justify-between gap-3 md:mb-5">
            <div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e50914]/80">Preview</p><h2 className="mt-1 text-2xl font-black tracking-[-0.05em] md:text-4xl">เลือกจากคลิปแนะนำ</h2></div>
            <span className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[10px] font-black text-white/45 ring-1 ring-white/8">เร็ว ๆ นี้</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
            {clipCards.map((card, index) => <ClipCard key={card.tag} card={card} index={index} />)}
          </div>
        </div>
      </section>
    </main>
  );
}
