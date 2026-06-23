const roadmap = [
  ['Dashboard', 'ภาพรวมหนังพร้อมดู รายงาน และสถานะระบบ'],
  ['Quick Add', 'เพิ่มหนังจาก TMDB และผูกลิงก์คอนเทนต์'],
  ['Reports', 'ตรวจรายงานลิงก์เสียจากผู้ชม'],
  ['Settings', 'ตั้งค่าเว็บ หมวดหมู่ และ SEO'],
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <a href="/" className="text-sm font-bold text-red-200/70 hover:text-red-100">← กลับหน้าเว็บ</a>
        <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-red-300/70">DOFree v3 Admin</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Admin Module Placeholder</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55">
            v3 เริ่มจาก public frontend ให้ build นิ่งก่อน จากนั้นค่อยเพิ่ม Supabase Admin เป็นโมดูลแยก เพื่อลดปัญหา TypeScript nullable และทำให้ deploy ผ่านง่ายกว่า v2
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {roadmap.map(([title, description]) => (
            <div key={title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-xl font-black">{title}</h2>
              <p className="mt-2 text-sm text-white/50">{description}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
