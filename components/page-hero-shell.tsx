import type { ReactNode } from 'react';
import { BackLink } from '@/components/back-link';

export function PageHeroShell({
  eyebrow,
  title,
  description,
  children,
  maxWidth = 'max-w-6xl',
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <main className="min-h-screen bg-[#030303] px-4 py-24 text-white md:px-8">
      <BackLink />
      <section className={`mx-auto ${maxWidth} rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.55)] md:p-10`}>
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#e50914]/85">{eyebrow}</p>
        <h1 className="mt-3 text-[36px] font-black tracking-[-0.07em] md:text-[64px]">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/48 md:text-base">{description}</p>
        {children}
      </section>
    </main>
  );
}
