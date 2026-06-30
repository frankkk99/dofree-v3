'use client';

export function AdminFrontManager() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 text-white md:px-8">
      <div className="admin-floating-glass rounded-2xl border border-white/10 p-5 md:rounded-[24px]">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#e50914]">Admin Front Manager</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] md:text-5xl">จัดการหน้าบ้าน</h1>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/72">
          โหมดแอดมินสำหรับดูการ์ดแบบหน้าบ้าน ค้นหา ตรวจลิงก์ จัดหมวดหมู่ และแก้สถานะ โดยไม่แตะ UI หน้าบ้านจริง
        </p>
      </div>
    </section>
  );
}
