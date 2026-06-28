const adminFieldBase =
  'rounded-xl border border-white/10 bg-[#080808] px-3 py-2 font-bold text-white outline-none placeholder:text-white/32 focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914]/35 disabled:cursor-not-allowed disabled:bg-white/[0.04] disabled:text-white/35 disabled:opacity-60';

export const adminInputClass = `${adminFieldBase} text-xs`;
export const adminInputClassSm = `${adminFieldBase} text-sm`;

export const adminSelectClass = `${adminInputClass} pr-9 [&>option]:bg-[#080808] [&>option]:text-white`;
export const adminSelectClassSm = `${adminInputClassSm} pr-9 [&>option]:bg-[#080808] [&>option]:text-white`;

export const adminTextareaClass =
  'rounded-2xl border border-white/10 bg-[#080808] p-4 font-mono text-xs leading-6 text-white outline-none placeholder:text-white/32 focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914]/35 disabled:cursor-not-allowed disabled:opacity-60';
