'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#030303] px-6 text-white">
      <section className="w-full max-w-xl rounded-[8px] border border-white/10 bg-white/[0.045] p-6 text-center shadow-[0_24px_90px_rgba(0,0,0,0.55)] md:p-8">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#e50914]/85">Something went wrong</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.07em] md:text-6xl">โหลดหน้านี้ไม่สำเร็จ</h1>
        <p className="mt-3 text-sm font-semibold leading-7 text-white/50">ลองโหลดใหม่อีกครั้ง หรือกลับหน้าแรกเพื่อเลือกหนังและซีรีส์ต่อ</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-xl bg-[#e50914] px-5 py-3 text-sm font-black text-white shadow-glow">
            ลองใหม่
          </button>
          <a href="/" className="rounded-xl border border-white/10 bg-white/[0.08] px-5 py-3 text-sm font-black text-white/78 hover:bg-white/[0.13]">
            กลับหน้าแรก
          </a>
        </div>
      </section>
    </main>
  );
}
