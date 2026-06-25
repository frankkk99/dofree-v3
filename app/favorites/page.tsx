export default function FavoritesPage() {
  return (
    <main className="min-h-screen bg-[#030303] px-4 py-24 text-white md:px-8">
      <section className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.55)] md:p-10">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#e50914]/85">My List</p>
        <h1 className="mt-3 text-[36px] font-black tracking-[-0.07em] md:text-[64px]">รายการโปรด</h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/48 md:text-base">
          เก็บหนังและซีรีส์ที่อยากดูไว้ในบัญชีเดียว เมื่อเชื่อมระบบสมาชิกแล้ว รายการนี้จะซิงก์กับบัญชีผู้ใช้ทุกอุปกรณ์
        </p>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-black/35 p-4">
            <p className="text-sm font-black">♡ บันทึกเรื่องที่สนใจ</p>
            <p className="mt-1 text-xs font-semibold text-white/42">กดเพิ่มจากการ์ดหรือหน้ารายละเอียดหนัง</p>
          </div>
          <div className="rounded-2xl bg-black/35 p-4">
            <p className="text-sm font-black">☁ ซิงก์กับบัญชี</p>
            <p className="mt-1 text-xs font-semibold text-white/42">ใช้ Supabase Auth + ตาราง favorites</p>
          </div>
          <div className="rounded-2xl bg-black/35 p-4">
            <p className="text-sm font-black">▶ ดูต่อได้เร็ว</p>
            <p className="mt-1 text-xs font-semibold text-white/42">เหมาะกับเว็บหนังที่มีรายการเยอะ</p>
          </div>
        </div>
      </section>
    </main>
  );
}
