'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { adminHelpModules, adminHelpSections, type AdminHelpSection } from '@/lib/admin-help-content';

type AdminHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function sectionMatches(section: AdminHelpSection, query: string) {
  if (!query) return true;
  return normalize([
    section.title,
    section.module,
    section.summary,
    ...section.steps,
    ...(section.tips || []),
    ...(section.warnings || []),
  ].join(' ')).includes(query);
}

function checklistText(section: AdminHelpSection) {
  return [
    `${section.title} (${section.module})`,
    section.summary,
    '',
    ...section.steps.map((step, index) => `${index + 1}. ${step}`),
    ...(section.tips?.length ? ['', 'Tips:', ...section.tips.map((tip) => `- ${tip}`)] : []),
    ...(section.warnings?.length ? ['', 'Warnings:', ...section.warnings.map((warning) => `- ${warning}`)] : []),
  ].join('\n');
}

export function AdminHelpModal({ open, onClose }: AdminHelpModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [openIds, setOpenIds] = useState<string[]>(() => [adminHelpSections[0]?.id || '']);
  const [copiedId, setCopiedId] = useState('');

  const normalizedQuery = normalize(query);

  const filteredSections = useMemo(() => {
    return adminHelpSections.filter((section) => {
      if (moduleFilter !== 'all' && section.module !== moduleFilter) return false;
      return sectionMatches(section, normalizedQuery);
    });
  }, [moduleFilter, normalizedQuery]);

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
      ));
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
    setOpenIds(filteredSections.map((section) => section.id));
  }, [filteredSections, normalizedQuery, open]);

  if (!open) return null;

  function toggleSection(id: string) {
    setOpenIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function copyChecklist(section: AdminHelpSection) {
    const text = checklistText(section);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(section.id);
      window.setTimeout(() => setCopiedId(''), 1400);
    } catch {
      setCopiedId('');
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1300] overflow-y-auto bg-black/72 p-3 text-white backdrop-blur-xl"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-help-title"
        className="mx-auto flex max-h-[calc(100dvh-24px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/12 bg-white/[0.085] shadow-[0_34px_120px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-3xl md:my-3 md:rounded-[28px]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-white/10 bg-black/64 p-4 backdrop-blur-2xl md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e50914]">Admin Help</p>
              <h2 id="admin-help-title" className="mt-2 break-words text-2xl font-black tracking-[-0.04em] md:text-4xl">
                คู่มือหลังบ้าน
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-white/58">
                วิธีใช้งานระบบจัดการคอนเทนต์ ผู้ใช้ แจ้งเตือน สมาชิก และการตั้งค่าต่าง ๆ
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="ปิดคู่มือหลังบ้าน"
              onClick={onClose}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-xl font-black text-white/78 transition hover:bg-[#e50914] hover:text-white md:h-12 md:w-12"
            >
              x
            </button>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto]">
            <label>
              <span className="sr-only">ค้นหาในคู่มือหลังบ้าน</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหา เช่น sync, users, watch URL, notification"
                className="h-11 w-full rounded-2xl border border-white/10 bg-black/48 px-4 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914]/35"
              />
            </label>
            <select
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value)}
              aria-label="กรองตาม module"
              className="h-11 rounded-2xl border border-white/10 bg-black/48 px-3 text-sm font-black text-white outline-none focus:border-[#e50914] focus:ring-1 focus:ring-[#e50914]/35 [&>option]:bg-[#080808] [&>option]:text-white"
            >
              <option value="all">All modules</option>
              {adminHelpModules.map((module) => <option key={module} value={module}>{module}</option>)}
            </select>
          </div>

          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setModuleFilter('all')}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-black ${moduleFilter === 'all' ? 'bg-white text-black' : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.14]'}`}
            >
              All
            </button>
            {adminHelpModules.map((module) => (
              <button
                key={module}
                type="button"
                onClick={() => setModuleFilter(module)}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-black ${moduleFilter === module ? 'bg-white text-black' : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.14]'}`}
              >
                {module}
              </button>
            ))}
          </div>
        </header>

        <div className="min-h-0 overflow-y-auto p-3 md:p-5">
          <div className="grid gap-3">
            {filteredSections.length ? filteredSections.map((section, index) => {
              const expanded = openIds.includes(section.id);
              const panelId = `admin-help-section-${section.id}`;
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
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#e50914]/16 px-2.5 py-1 text-[10px] font-black uppercase text-red-100">{section.module}</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/34">Guide {index + 1}</span>
                      </span>
                      <span className="mt-2 block break-words text-base font-black text-white md:text-lg">{section.title}</span>
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
                        <div className="mt-3 rounded-xl border border-sky-300/12 bg-sky-400/[0.055] p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-100/70">Tips</p>
                          <ul className="mt-2 grid gap-1.5 text-xs font-semibold leading-5 text-sky-50/62">
                            {section.tips.map((tip) => <li key={tip} className="break-words">{tip}</li>)}
                          </ul>
                        </div>
                      ) : null}

                      {section.warnings?.length ? (
                        <div className="mt-3 rounded-xl border border-[#e50914]/18 bg-[#e50914]/[0.07] p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/80">Warnings</p>
                          <ul className="mt-2 grid gap-1.5 text-xs font-semibold leading-5 text-red-50/66">
                            {section.warnings.map((warning) => <li key={warning} className="break-words">{warning}</li>)}
                          </ul>
                        </div>
                      ) : null}

                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void copyChecklist(section)}
                          className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white/70 hover:bg-white/[0.14] hover:text-white"
                        >
                          {copiedId === section.id ? 'Copied' : 'Copy checklist'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </section>
              );
            }) : (
              <div className="rounded-2xl border border-white/8 bg-black/36 p-5 text-sm font-black text-white/45">ไม่พบหัวข้อที่ตรงกับคำค้น</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
