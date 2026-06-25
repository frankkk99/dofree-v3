'use client';

export function BackLink() {
  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="fixed left-4 top-4 z-[90] text-[11px] font-black uppercase tracking-[0.16em] text-[#e50914] transition hover:text-red-300 md:left-6 md:top-5 md:text-xs"
    >
      ‹ ย้อนกลับ
    </button>
  );
}
