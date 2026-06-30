'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { userHelpFaqs, userHelpSections } from '@/lib/user-help-content';

type UserHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function containsQuery(values: string[], query: string) {
  if (!query) return true;
  return normalize(values.join(' ')).includes(query);
}

export function UserHelpModal({ open, onClose }: UserHelpModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [openSectionIds, setOpenSectionIds] = useState<string[]>(() => [userHelpSections[0]?.id || '']);
  const [openFaqIds, setOpenFaqIds] = useState<string[]>([]);

  const normalizedQuery = normalize(query);

  const filteredSections = useMemo(() => {
    return userHelpSections.filter((section) => containsQuery([
      section.title,
      section.summary,
      ...section.steps,
      ...(section.tips || []),
    ], normalizedQuery));
  }, [normalizedQuery]);

  const filteredFaqs = useMemo(() => {
    return userHelpFaqs.filter((faq) => containsQuery([faq.question, faq.answer], normalizedQuery));
  }, [normalizedQuery]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute('aria-hidden'));

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !normalizedQuery) return;
    setOpenSectionIds(filteredSections.map((section) => section.id));
    setOpenFaqIds(filteredFaqs.map((faq) => faq.id));
  }, [filteredFaqs, filteredSections, normalizedQuery, open]);

  if (!open) return null;

  function toggleSection(id: string) {
    setOpenSectionIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function toggleFaq(id: string) {
    setOpenFaqIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  return (
    <div
      className="fixed inset-0 z-[1200] overflow-y-auto bg-black/72 p-3 text-white backdrop-blur-xl"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-help-title"
        className="mx-auto flex max-h-[calc(100dvh-24px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/12 bg-white/[0.085] shadow-[0_34px_120px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-3xl md:my-3 md:rounded-[28px]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 border-b border-white/10 bg-black/62 p-4 backdrop-blur-2xl md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">Help Center</p>
              <h2 id="user-help-title" className="mt-2 break-words text-2xl font-black tracking-[-0.04em] md:text-4xl">
                วิธีใช้งานดูดีดี.online
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/58">
                คู่มือการค้นหา รับชม บันทึกรายการโปรด และใช้งานระบบต่าง ๆ
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="ปิดคู่มือวิธีใช้งานเว็บ"
              onClick={onClose}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-xl font-black text-white/78 transition hover:bg-[#e50914] hover:text-white md:h-12 md:w-12"
            >
              x
            </button>
          </div>

          <label className="mt-4 block">
            <span className="sr-only">ค้นหาในคู่มือ</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาในคู่มือ เช่น รายการโปรด, ซีรีส์, แจ้งปัญหา"
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/48 px-4 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914]/35"
            />
          </label>
        </header>

        <div className="min-h-0 overflow-y-auto p-3 md:p-5">
          <div className="grid gap-3">
            {filteredSections.length ? filteredSections.map((section, index) => {
              const expanded = openSectionIds.includes(section.id);
              const panelId = `help-section-${section.id}`;
              return (
                <section key={section.id} className="rounded-2xl border border-white/8 bg-black/36 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => toggleSection(section.id)}
                    className="flex w-full items-start justify-between gap-3 rounded-2xl px-4 py-4 text-left transition hover:bg-white/[0.045]"
                  >
                    <span className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e50914]/80">Guide {index + 1}</span>
                      <span className="mt-1 block break-words text-base font-black text-white md:text-lg">{section.title}</span>
                      <span className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-white/45">{section.summary}</span>
                    </span>
                    <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-lg font-black text-white/70">
                      {expanded ? '-' : '+'}
                    </span>
                  </button>
                  {expanded ? (
                    <div id={panelId} className="px-4 pb-4">
                      <p className="break-words text-sm font-semibold leading-7 text-white/64">{section.summary}</p>
                      <ol className="mt-3 grid gap-2">
                        {section.steps.map((step, stepIndex) => (
                          <li key={step} className="grid grid-cols-[28px_1fr] gap-3 rounded-xl bg-white/[0.045] p-3 text-sm font-semibold leading-6 text-white/62">
                            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#e50914]/16 text-xs font-black text-red-100">{stepIndex + 1}</span>
                            <span className="break-words">{step}</span>
                          </li>
                        ))}
                      </ol>
                      {section.tips?.length ? (
                        <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.035] p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/36">Tips</p>
                          <ul className="mt-2 grid gap-1.5 text-xs font-semibold leading-5 text-white/50">
                            {section.tips.map((tip) => <li key={tip} className="break-words">{tip}</li>)}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              );
            }) : (
              <div className="rounded-2xl border border-white/8 bg-black/36 p-5 text-sm font-black text-white/45">ไม่พบหัวข้อที่ตรงกับคำค้นหา</div>
            )}
          </div>

          <section className="mt-5 rounded-2xl border border-white/10 bg-black/42 p-3 md:p-4">
            <div className="px-1">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e50914]">FAQ</p>
              <h3 className="mt-1 text-xl font-black tracking-[-0.03em]">คำถามที่พบบ่อย</h3>
            </div>
            <div className="mt-3 grid gap-2">
              {filteredFaqs.length ? filteredFaqs.map((faq) => {
                const expanded = openFaqIds.includes(faq.id);
                const panelId = `help-faq-${faq.id}`;
                return (
                  <div key={faq.id} className="rounded-2xl bg-white/[0.055]">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      onClick={() => toggleFaq(faq.id)}
                      className="flex w-full items-start justify-between gap-3 rounded-2xl px-4 py-3 text-left hover:bg-white/[0.045]"
                    >
                      <span className="break-words text-sm font-black text-white/82">{faq.question}</span>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.08] text-sm font-black text-white/64">{expanded ? '-' : '+'}</span>
                    </button>
                    {expanded ? <p id={panelId} className="break-words px-4 pb-4 text-sm font-semibold leading-6 text-white/56">{faq.answer}</p> : null}
                  </div>
                );
              }) : (
                <div className="rounded-2xl bg-white/[0.045] p-4 text-sm font-black text-white/45">ไม่พบ FAQ ที่ตรงกับคำค้นหา</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
