'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const plannedFeatures = [
  'สมัครสมาชิกและเข้าสู่ระบบ',
  'เก็บรายการโปรด',
  'ประวัติการรับชม',
  'ดูต่อจากเรื่องล่าสุด',
  'จัดการโปรไฟล์ผู้ใช้',
  'ฟีเจอร์สมาชิกและการแจ้งเตือน',
];

function HeaderTemporaryStyles() {
  return (
    <style>{`
      main > header a[href="/watch-ready"] {
        display: none !important;
      }

      [data-dofree-menu-button="true"] {
        width: 36px !important;
        height: 36px !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        outline: none !important;
      }

      [data-dofree-menu-button="true"]:hover,
      [data-dofree-menu-button="true"]:focus-visible {
        background: transparent !important;
        box-shadow: none !important;
      }

      [data-dofree-menu-button="true"] > span {
        gap: 5px !important;
      }

      [data-dofree-menu-button="true"] > span > span {
        width: 24px !important;
        height: 2px !important;
        border-radius: 999px !important;
        background: #fff !important;
        box-shadow: none !important;
      }
    `}</style>
  );
}

export function CleanHamburgerMenu() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);

    function interceptHamburger(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('[data-dofree-menu-button="true"]');
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setOpen(true);
    }

    document.addEventListener('click', interceptHamburger, true);
    return () => document.removeEventListener('click', interceptHamburger, true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const notice = mounted && open ? createPortal(
    <div className="fixed inset-0 z-[1100] grid place-items-center bg-black/76 px-4 text-white backdrop-blur-xl" onMouseDown={() => setOpen(false)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="ระบบผู้ใช้อยู่ระหว่างพัฒนา"
        className="w-full max-w-[430px] overflow-hidden rounded-[30px] border border-white/12 bg-[#050505] shadow-[0_38px_130px_rgba(0,0,0,0.92)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/8 bg-white/[0.035] p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">User System</p>
            <h2 className="mt-2 text-[27px] font-black leading-none tracking-[-0.07em] md:text-[32px]">อยู่ระหว่างพัฒนา</h2>
          </div>
          <button
            type="button"
            aria-label="ปิดข้อความ"
            onClick={() => setOpen(false)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.08] text-xl font-black text-white/80 transition hover:bg-white/[0.14] hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm font-bold leading-6 text-white/70">
            ระบบผู้ใช้กำลังอยู่ระหว่างพัฒนา เพื่อรองรับการเก็บรายการโปรด ประวัติการรับชม และฟีเจอร์ส่วนตัวอื่น ๆ ก่อนเปิดใช้งานจริง
          </p>

          <div className="mt-5 rounded-[22px] border border-white/8 bg-white/[0.045] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/36">ฟีเจอร์ที่จะเปิดให้ใช้</p>
            <div className="mt-3 grid gap-2">
              {plannedFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2 rounded-2xl bg-black/38 px-3 py-2.5 text-xs font-black text-white/74">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-[#e50914]/18 text-[10px] text-red-100">•</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-[#e50914]/18 bg-[#170203]/45 p-4 text-xs font-bold leading-5 text-red-100/72">
            ตอนนี้ปุ่ม hamburger จะแสดงข้อความนี้ไว้ก่อน ส่วนผู้ดูแลระบบให้เข้า <span className="font-black text-white">/admin</span> โดยตรงไปก่อน เมื่อระบบเสร็จแล้วค่อยเปิดเมนูเต็มอีกครั้ง
          </div>
        </div>
      </section>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <HeaderTemporaryStyles />
      {notice}
    </>
  );
}
