export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#030303] px-6 text-white">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-[#e50914]" />
        <p className="mt-6 text-[11px] font-black uppercase tracking-[0.28em] text-[#e50914]/85">Loading</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.06em]">กำลังเตรียมรายการให้คุณ</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-white/46">ระบบกำลังโหลดหนัง ซีรีส์ และข้อมูลล่าสุด</p>
      </div>
    </main>
  );
}
