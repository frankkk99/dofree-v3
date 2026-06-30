type MediaPlaceholderProps = {
  variant?: 'poster' | 'backdrop' | 'admin';
  title?: string;
  subtitle?: string;
  className?: string;
};

export function MediaPlaceholder({
  variant = 'poster',
  title,
  subtitle,
  className = '',
}: MediaPlaceholderProps) {
  const isBackdrop = variant === 'backdrop';
  const label = title || (isBackdrop ? 'ภาพโปรโมตกำลังอัปเดต' : 'โปสเตอร์กำลังอัปเดต');
  const desc = subtitle || (isBackdrop ? 'กำลังซิงก์ภาพล่าสุดจากแหล่งข้อมูล' : 'ภาพหน้าปกจะอัปเดตเร็ว ๆ นี้');

  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-[#090909] ${className}`}
      aria-label={label}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(229,9,20,0.32),transparent_22rem),radial-gradient(circle_at_78%_72%,rgba(255,255,255,0.12),transparent_20rem),linear-gradient(135deg,#111_0%,#050505_42%,#210407_100%)]" />
      <div className="absolute inset-0 opacity-55 blur-2xl bg-[conic-gradient(from_210deg_at_50%_50%,rgba(255,255,255,0.08),rgba(229,9,20,0.22),rgba(255,255,255,0.03),rgba(229,9,20,0.16),rgba(255,255,255,0.08))]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.26)_45%,rgba(0,0,0,0.72)_100%)]" />
      <div className={`absolute ${isBackdrop ? 'left-5 top-1/2 max-w-sm -translate-y-1/2 md:left-12' : 'inset-x-3 top-1/2 -translate-y-1/2'} rounded-2xl border border-white/12 bg-white/[0.08] p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-4`}>
        <div className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-white/[0.10] text-lg font-black text-white/78 ring-1 ring-white/10 md:h-12 md:w-12 md:text-2xl">▣</div>
        <p className="mt-3 text-[10px] font-black leading-tight text-white md:text-sm">{label}</p>
        <p className="mt-1 text-[8px] font-bold leading-snug text-white/48 md:text-xs">{desc}</p>
      </div>
    </div>
  );
}
