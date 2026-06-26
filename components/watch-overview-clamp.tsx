'use client';

import { useState } from 'react';

export function WatchOverviewClamp({ text }: { text?: string }) {
  const [expanded, setExpanded] = useState(false);
  const overview = text?.trim();

  if (!overview) {
    return <p className="mt-4 text-sm leading-7 text-white/42 md:text-base md:leading-8">ยังไม่มีรายละเอียดเรื่องนี้</p>;
  }

  return (
    <div className="mt-4">
      <p className={`${expanded ? '' : 'line-clamp-3'} max-w-4xl text-sm leading-7 text-white/58 md:text-base md:leading-8`}>
        {overview}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-black text-white/68 transition hover:border-[#e50914]/50 hover:bg-[#e50914]/14 hover:text-white"
      >
        {expanded ? 'ย่อรายละเอียด' : 'ดูเพิ่มเติม'}
      </button>
    </div>
  );
}
