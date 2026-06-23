const stats = [
  ['ภาพยนตร์ทั้งหมด', '286', 'ทั้งหมดในระบบ', '◉'],
  ['เผยแพร่แล้ว', '232', 'พร้อมรับชม', '▣'],
  ['ลิงก์เสีย', '18', 'ต้องดำเนินการ', '↯'],
  ['หมวดหมู่ทั้งหมด', '24', 'หมวดหมู่', '▤'],
];

const menu = ['แดชบอร์ด', 'ภาพยนตร์', 'หมวดหมู่', 'นักแสดง', 'ผู้กำกับ', 'รายงานลิงก์เสีย', 'ลิงก์ Google Drive', 'ผู้ใช้งาน', 'การตั้งค่า'];

const latest = [
  ['The Last Horizon', 'แอ็กชัน', '2024', 'เผยแพร่แล้ว'],
  ['Echoes of Tomorrow', 'ไซไฟ', '2024', 'เผยแพร่แล้ว'],
  ['Secret Garden', 'ดราม่า', '2023', 'เผยแพร่แล้ว'],
  ['City of Dreams', 'ระทึกขวัญ', '2024', 'review'],
  ['The Hidden Truth', 'สืบสวน', '2023', 'broken'],
];

const reports = ['The Lost Planet', 'Midnight Shadow', 'Love Beyond Time', 'War of Kingdoms', 'Silent Memory'];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#08101d] text-white">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-white/10 bg-[#0b1424] p-5 lg:flex lg:flex-col">
          <div>
            <h1 className="text-xl font-black">ระบบจัดการเนื้อหาภาพยนตร์</h1>
            <p className="mt-1 text-xs text-white/45">แผงควบคุมผู้ดูแลระบบ</p>
          </div>
          <nav className="mt-8 space-y-2">
            {menu.map((item, index) => (
              <a key={item} href={index === 0 ? '/admin' : '#'} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${index === 0 ? 'bg-[#4b65ff] text-white' : 'text-white/58 hover:bg-white/[0.06] hover:text-white'}`}>
                <span>{['▦','▥','▤','♙','⚒','⚠','☁','♙','⚙'][index]}</span>
                {item}
              </a>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#4b65ff] font-black">A</div>
              <div>
                <p className="font-black">ผู้ดูแลระบบ</p>
                <p className="text-xs text-green-300">● ออนไลน์</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="p-5 md:p-8">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <a href="/" className="text-sm font-black text-red-200/75 hover:text-red-100">← กลับหน้าเว็บ</a>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] md:text-5xl">ยินดีต้อนรับกลับ, ผู้ดูแลระบบ</h2>
              <p className="mt-2 text-white/45">ภาพรวมการจัดการเนื้อหาภาพยนตร์ของคุณ</p>
            </div>
            <div className="text-sm font-bold text-white/55">23 พฤษภาคม 2567, 15:30</div>
          </header>

          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map(([title, value, desc, icon]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 shadow-[0_18px_80px_rgba(0,0,0,0.25)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/50">{title}</p>
                    <p className="mt-2 text-4xl font-black">{value}</p>
                    <p className="mt-1 text-xs text-white/35">{desc}</p>
                  </div>
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-white/10 text-2xl text-blue-200">{icon}</div>
                </div>
              </div>
            ))}
          </section>

          <section className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr_360px]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black">กิจกรรมล่าสุด</h3>
                <span className="rounded-xl bg-white/10 px-3 py-1 text-xs text-white/50">7 วันล่าสุด</span>
              </div>
              <div className="mt-5 h-[220px] rounded-xl border border-white/5 bg-[linear-gradient(180deg,rgba(75,101,255,0.2),rgba(75,101,255,0.02))] p-5">
                <div className="grid h-full place-items-center text-white/35">กราฟกิจกรรม / ยอดเข้าชม / ดาวน์โหลด</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {['เพิ่มภาพยนตร์ 12', 'อัปเดตข้อมูล 28', 'ผู้เข้าชม 1,245', 'ดาวน์โหลด 532'].map((item) => <div key={item} className="rounded-xl bg-white/[0.06] p-3 text-sm font-bold text-white/70">{item}</div>)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-black">รายงานลิงก์เสีย <span className="rounded-full bg-red-500 px-2 py-1 text-xs">18</span></h3>
                <a href="#" className="text-xs font-black text-blue-300">ดูทั้งหมด</a>
              </div>
              <div className="space-y-3">
                {reports.map((title, index) => (
                  <div key={title} className="flex items-center justify-between rounded-xl bg-white/[0.04] p-3">
                    <div>
                      <p className="font-bold">{title}</p>
                      <p className="text-xs text-white/35">drive.google.com/file/d/{index + 1}XYZ...</p>
                    </div>
                    <button className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-white/60">จัดการ</button>
                  </div>
                ))}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <h3 className="text-lg font-black">เพิ่มภาพยนตร์ด่วน</h3>
                <div className="mt-4 space-y-3">
                  <input placeholder="ชื่อภาพยนตร์" className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm outline-none placeholder:text-white/30" />
                  <input placeholder="ลิงก์ Google Drive" className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm outline-none placeholder:text-white/30" />
                  <button className="w-full rounded-xl bg-[#4b65ff] px-4 py-3 text-sm font-black">บันทึกภาพยนตร์</button>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <h3 className="text-lg font-black">จัดการลิงก์ Google Drive</h3>
                <div className="mt-4 space-y-3 text-sm text-white/55">
                  {['ภาพยนตร์ 156 ไฟล์', 'ซีรีส์ 68 ไฟล์', 'สารคดี 32 ไฟล์', 'อนิเมะ 24 ไฟล์'].map((item) => <p key={item} className="flex justify-between rounded-xl bg-white/[0.04] px-3 py-2"><span>▢</span><span>{item}</span></p>)}
                </div>
              </div>
            </aside>
          </section>

          <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-black">ภาพยนตร์ที่เผยแพร่ล่าสุด</h3>
              <a href="#" className="text-xs font-black text-blue-300">ดูทั้งหมด</a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-white/35">
                  <tr><th className="py-3">#</th><th>ชื่อภาพยนตร์</th><th>หมวดหมู่</th><th>ปี</th><th>สถานะ</th><th>จัดการ</th></tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {latest.map(([title, category, year, status], index) => (
                    <tr key={title} className="text-white/72">
                      <td className="py-4">{index + 1}</td><td className="font-bold text-white">{title}</td><td>{category}</td><td>{year}</td><td><span className="rounded-md bg-green-500/15 px-2 py-1 text-xs font-black text-green-200">{status}</span></td><td><button className="rounded-lg bg-[#4b65ff] px-3 py-2 text-xs font-black">แก้ไข</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
