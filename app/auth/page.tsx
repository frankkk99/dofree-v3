export default function AuthPage() {
  return (
    <main className="min-h-screen bg-[#030303] px-4 py-24 text-white md:px-8">
      <section className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[1fr_420px] md:items-start">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.55)] md:p-10">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#e50914]/85">Auth Center</p>
          <h1 className="mt-3 text-[36px] font-black tracking-[-0.07em] md:text-[64px]">เข้าสู่ระบบ / สมัครสมาชิก</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/48 md:text-base">
            หน้านี้เป็นทางเข้าระบบบัญชีหลักของ DOFree ต่อไปจะเชื่อม Supabase Auth เพื่อใช้กับรายการโปรด ประวัติการรับชม และสิทธิ์สมาชิก
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {['Google', 'Facebook', 'Apple', 'LINE', 'Email + Password', 'Phone OTP'].map((item) => (
              <button key={item} type="button" className="rounded-2xl bg-white/[0.07] px-4 py-4 text-left text-sm font-black text-white/78 transition hover:bg-[#e50914] hover:text-white">
                {item}
              </button>
            ))}
          </div>
        </div>

        <aside className="rounded-[32px] border border-[#e50914]/24 bg-[#160203]/70 p-6 shadow-[0_0_40px_rgba(229,9,20,0.16)]">
          <h2 className="text-2xl font-black tracking-[-0.05em]">ควรต่อระบบจริงแบบนี้</h2>
          <ol className="mt-5 grid gap-3 text-sm font-bold text-white/62">
            <li>1. เปิด Supabase Auth providers</li>
            <li>2. สร้างตาราง profiles</li>
            <li>3. แยก role: user / premium / admin</li>
            <li>4. สร้าง favorites และ watch_history</li>
            <li>5. ผูก Admin กับ role ไม่ใช้ token อย่างเดียว</li>
          </ol>
          <a href="/admin" className="mt-6 flex items-center justify-between rounded-2xl bg-[#e50914] px-5 py-4 text-sm font-black text-white shadow-glow">
            Admin login <span>›</span>
          </a>
        </aside>
      </section>
    </main>
  );
}
