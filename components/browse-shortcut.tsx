'use client';

export function BrowseShortcut() {
  return (
    <a
      href="/browse"
      className="fixed bottom-4 right-4 z-[70] rounded-full border border-white/12 bg-black/62 px-4 py-3 text-[11px] font-black text-white/82 shadow-[0_18px_70px_rgba(0,0,0,0.62)] backdrop-blur-xl transition hover:border-[#e50914]/70 hover:bg-[#170203] md:bottom-6 md:right-6 md:text-xs"
    >
      หมวดหมู่ทั้งหมด
    </a>
  );
}
