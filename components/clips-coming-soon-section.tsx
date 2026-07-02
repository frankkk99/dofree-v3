const clipCards = [
  { badge: 'Shorts', title: 'คลิปสั้นก่อนเลือกดู', meta: 'ดูฟีลก่อนตัดสินใจ', tone: 'from-[#e50914]/80 via-[#5a1016]/70 to-black' },
  { badge: 'สรุปหนัง', title: 'เล่าเร็วเข้าใจง่าย', meta: 'ช่วยเลือกเรื่อง', tone: 'from-[#6d28d9]/80 via-[#251050]/75 to-black' },
  { badge: 'มีสปอย', title: 'สปอยแบบกดเปิดเอง', meta: 'มีคำเตือนก่อนดู', tone: 'from-[#f59e0b]/75 via-[#522f08]/75 to-black' },
  { badge: 'ตัวอย่าง', title: 'ตัวอย่างพากย์ไทย', meta: 'ดูในเว็บ', tone: 'from-[#0ea5e9]/75 via-[#083344]/75 to-black' },
  { badge: 'ฉากเด็ด', title: 'ฉากที่ทำให้อยากดู', meta: 'คัดให้ตัดสินใจเร็ว', tone: 'from-[#10b981]/70 via-[#063d2b]/75 to-black' },
];

function ComingSoonCard({ card, index }: { card: typeof clipCards[number]; index: number }) {
  return (
    <article className="group relative h-[208px] w-[132px] shrink-0 overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.045] shadow-[0_18px_60px_rgba(0,0,0,0.46)] sm:h-[248px] sm:w-[156px] md:h-[286px] md:w-[184px]">
      <div className={`absolute inset-0 bg-gradient-to-br ${card.tone}`} />
      <div className="absolute inset-0 scale-110 opacity-70 blur-xl">
        <div className="absolute left-4 top-6 h-24 w-24 rounded-full bg-white/25" />
        <div className="absolute bottom-4 right-3 h-28 w-20 rounded-full bg-[#e50914]/35" />
        <div className="absolute inset-x-4 top-24 h-20 rounded-[28px] bg-black/30" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06)_0%,rgba(0,0,0,0.18)_40%,rgba(0,0,0,0.90)_100%)]" />
      <div className="absolute left-2 top-2 rounded-full bg-black/50 px-2.5 py-1 text-[9px] font-black text-white/78 ring-1 ring-white/10 backdrop-blur-xl md:text-[10px]">{card.badge}</div>
      <div className="absolute inset-x-[-24px] top-[44%] -rotate-12 bg-[#e50914]/92 py-2 text-center text-[10px] font-black tracking-[0.12em] text-white shadow-[0_14px_36px_rgba(229,9,20,0.28)] md:text-xs">
        ฟีเจอร์ใหม่เร็ว ๆ นี้
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3 md:p-4">
        <p className="line-clamp-2 text-sm font-black leading-tight tracking-[-0.035em] text-white md:text-base">{card.title}</p>
        <p className="mt-1 text-[10px] font-bold text-white/44 md:text-xs">{card.meta}</p>
      </div>
      <div className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/[0.10] text-[10px] font-black text-white/58 backdrop-blur-xl">{index + 1}</div>
    </article>
  );
}

export function ClipsComingSoonSection({ standalone = false }: { standalone?: boolean }) {
  return (
    <section className={`${standalone ? 'mx-auto max-w-[1440px] px-4 py-5 md:px-7 md:py-8' : ''}`}>
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(229,9,20,0.18),transparent_24rem),linear-gradient(135deg,rgba(255,255,255,0.065),rgba(255,255,255,0.025))] p-4 shadow-[0_26px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.08)] md:rounded-[34px] md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]/85">Coming Soon</p>
            <h2 className="mt-1 text-[24px] font-black leading-none tracking-[-0.06em] text-white md:text-4xl">ไม่รู้จะดูอะไรดี?</h2>
            <p className="mt-2 max-w-2xl text-xs font-semibold leading-5 text-white/52 md:text-sm md:leading-6">
              ดูคลิปสั้น ตัวอย่าง สรุป และสปอยแบบมีคำเตือนก่อนเลือกเรื่องที่จะดู
            </p>
          </div>
          <a href="/clips" className="inline-flex h-10 items-center justify-center rounded-full bg-white/[0.09] px-4 text-xs font-black text-white/70 ring-1 ring-white/10 transition hover:bg-white/[0.14] hover:text-white md:h-11 md:px-5">
            ดูฟีเจอร์ ›
          </a>
        </div>

        <div className="movie-rail mt-4 flex gap-3 overflow-x-auto pb-1 md:mt-5 md:gap-4">
          {clipCards.map((card, index) => <ComingSoonCard key={card.badge} card={card} index={index} />)}
        </div>
      </div>
    </section>
  );
}
