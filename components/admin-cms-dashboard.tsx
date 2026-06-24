const stats = [
  { label: 'คอนเทนต์ทั้งหมด', value: '1,240', helper: '+128 จาก TMDB Feed', tone: 'from-[#e50914] to-[#7a050b]' },
  { label: 'พร้อมรับชม', value: '86', helper: 'มีลิงก์ watch_url แล้ว', tone: 'from-[#f4c46b] to-[#8b5d12]' },
  { label: 'รอตรวจสอบ', value: '312', helper: 'ควรเช็กชื่อไทย / หมวดหมู่', tone: 'from-white/18 to-white/5' },
  { label: 'ลิงก์มีปัญหา', value: '14', helper: 'รอแก้จาก Report', tone: 'from-[#ef4444] to-[#4c0508]' },
];

const queueItems = [
  { title: 'The Silent Code', type: 'Movie', status: 'พร้อมเผยแพร่', tag: 'พร้อมดู', score: '8.6' },
  { title: 'Bangkok Midnight', type: 'Series', status: 'รอใส่ลิงก์', tag: 'ไทย', score: '7.9' },
  { title: 'The Last Signal', type: 'Movie', status: 'รอตรวจข้อมูล', tag: 'ใหม่', score: '8.1' },
  { title: 'Red Ocean', type: 'Movie', status: 'ลิงก์เสีย', tag: 'Report', score: '6.8' },
];

const modules = [
  'Quick Add จาก TMDB ID',
  'จัดหมวดหมู่หน้าแรก',
  'ตั้งค่า Watch Ready',
  'ตรวจลิงก์เสีย',
  'SEO Title / Description',
  'Supabase Auth',
];

function StatusPill({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black ${active ? 'bg-[#e50914] text-white shadow-glow' : 'bg-white/[0.07] text-white/60'}`}>
      {children}
    </span>
  );
}

export function AdminCmsDashboard() {
  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <section className="relative overflow-hidden border-b border-white/[0.08] px-4 py-8 md:px-8 md:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(229,9,20,0.24),transparent_30rem),radial-gradient(circle_at_82%_10%,rgba(244,196,107,0.12),transparent_24rem),linear-gradient(180deg,#050000,#030303)]" />
        <div className="relative z-10 mx-auto max-w-[1600px]">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <a href="/" className="text-xs font-black text-red-200/70 hover:text-red-100">← กลับหน้าแรก</a>
              <p className="mt-7 text-[10px] font-black uppercase tracking-[0.34em] text-[#e50914] md:text-xs">DOFree Admin CMS</p>
              <h1 className="mt-3 max-w-4xl text-[42px] font-black leading-[0.9] tracking-[-0.08em] md:text-[76px]">จัดการคอนเทนต์ หนัง ลิงก์ และ SEO</h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/56 md:text-lg md:leading-8">
                หน้า mockup สำหรับเฟส Admin Module ใช้โชว์ภาพรวมระบบก่อนต่อ Supabase จริง: เพิ่มหนังจาก TMDB, ใส่ลิงก์รับชม, จัดหมวดหน้าแรก และตรวจสถานะคอนเทนต์
              </p>
            </div>
            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.045] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.72)] backdrop-blur-2xl md:w-[360px]">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/38">System Status</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill active>Demo Mode</StatusPill>
                <StatusPill>TMDB Ready</StatusPill>
                <StatusPill>Supabase Next</StatusPill>
              </div>
              <div className="mt-5 rounded-2xl bg-black/38 p-4">
                <p className="text-xs font-black text-white/50">เฟสต่อไปที่ควรทำ</p>
                <p className="mt-1 text-xl font-black tracking-[-0.05em] text-white">Quick Add + Watch Link</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 py-6 md:px-8 md:py-8">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <article key={item.label} className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.045] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.55)] md:p-5">
              <div className={`h-1.5 rounded-full bg-gradient-to-r ${item.tone}`} />
              <p className="mt-4 text-[11px] font-black text-white/42">{item.label}</p>
              <h2 className="mt-2 text-4xl font-black tracking-[-0.06em] md:text-5xl">{item.value}</h2>
              <p className="mt-2 text-xs font-semibold text-white/42 md:text-sm">{item.helper}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
          <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.045] p-4 shadow-[0_26px_90px_rgba(0,0,0,0.62)] md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">Quick Add</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.06em] md:text-4xl">เพิ่มหนังเข้าระบบ</h2>
              </div>
              <StatusPill active>Mockup</StatusPill>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs font-black text-white/46">TMDB ID</span>
                <input placeholder="เช่น 550" className="mt-2 h-12 w-full rounded-2xl border border-white/[0.08] bg-black/38 px-4 text-sm font-bold text-white outline-none placeholder:text-white/26 focus:border-[#e50914]/70" />
              </label>
              <label className="block">
                <span className="text-xs font-black text-white/46">ลิงก์รับชม / Google Drive Preview</span>
                <input placeholder="https://drive.google.com/file/d/.../view" className="mt-2 h-12 w-full rounded-2xl border border-white/[0.08] bg-black/38 px-4 text-sm font-bold text-white outline-none placeholder:text-white/26 focus:border-[#e50914]/70" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-black text-white/46">หมวดแนะนำ</span>
                  <select className="mt-2 h-12 w-full rounded-2xl border border-white/[0.08] bg-black/38 px-4 text-sm font-bold text-white outline-none focus:border-[#e50914]/70">
                    <option>Watch Ready</option>
                    <option>มาใหม่</option>
                    <option>ยอดนิยม</option>
                    <option>หนังไทย</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-black text-white/46">สถานะ</span>
                  <select className="mt-2 h-12 w-full rounded-2xl border border-white/[0.08] bg-black/38 px-4 text-sm font-bold text-white outline-none focus:border-[#e50914]/70">
                    <option>Published</option>
                    <option>Review</option>
                    <option>Draft</option>
                    <option>Broken</option>
                  </select>
                </label>
              </div>
              <button type="button" className="h-12 w-full rounded-2xl bg-[#e50914] text-sm font-black text-white shadow-glow transition hover:scale-[1.01]">บันทึกคอนเทนต์</button>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.045] p-4 shadow-[0_26px_90px_rgba(0,0,0,0.62)] md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">Content Queue</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.06em] md:text-4xl">รายการรอตรวจ</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill active>ทั้งหมด</StatusPill>
                <StatusPill>พร้อมดู</StatusPill>
                <StatusPill>รอตรวจ</StatusPill>
                <StatusPill>ลิงก์เสีย</StatusPill>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07]">
              {queueItems.map((item, index) => (
                <div key={item.title} className={`grid grid-cols-[1fr_auto] gap-4 p-4 md:grid-cols-[1.2fr_0.45fr_0.45fr_0.35fr] md:items-center ${index > 0 ? 'border-t border-white/[0.07]' : ''}`}>
                  <div>
                    <p className="text-sm font-black text-white md:text-base">{item.title}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/36">{item.type}</p>
                  </div>
                  <span className="hidden text-xs font-bold text-white/50 md:block">{item.status}</span>
                  <span className="hidden text-xs font-black text-[#f4c46b] md:block">★ {item.score}</span>
                  <span className={`justify-self-end rounded-full px-3 py-1 text-[10px] font-black ${item.tag === 'Report' ? 'bg-red-500/18 text-red-200' : 'bg-white/[0.08] text-white/68'}`}>{item.tag}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">Roadmap Modules</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.06em] md:text-4xl">โมดูลที่ต้องต่อให้เป็นระบบจริง</h2>
            </div>
            <a href="/watch-ready" className="text-sm font-black text-white/55 hover:text-white">ดูหน้า Watch Ready ›</a>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module, index) => (
              <div key={module} className="rounded-2xl border border-white/[0.07] bg-black/28 p-4">
                <p className="text-[10px] font-black text-[#e50914]">STEP {String(index + 1).padStart(2, '0')}</p>
                <p className="mt-2 text-sm font-black text-white md:text-base">{module}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
