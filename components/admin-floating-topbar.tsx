'use client';

import { useEffect, useState } from 'react';

const tabs = [
  { id: 'admin-dashboard-root', label: 'Dashboard' },
  { id: 'admin-control-center', label: 'Control' },
  { id: 'series-bulk-manager', label: 'Series' },
  { id: 'admin-audit-log', label: 'History' },
  { id: 'catalog-manager', label: 'Catalog' },
];

function setSectionVisible(activeId: string) {
  for (const tab of tabs) {
    const node = document.getElementById(tab.id);
    if (node) node.style.display = tab.id === activeId ? '' : 'none';
  }
}

export function AdminFloatingTopbar() {
  const [active, setActive] = useState(tabs[0].id);

  useEffect(() => {
    setSectionVisible(active);
  }, [active]);

  return (
    <div className="sticky top-3 z-[80] mx-auto w-full max-w-7xl px-3 pt-3 md:px-8">
      <div className="flex items-center gap-2 overflow-x-auto rounded-[24px] border border-white/12 bg-black/60 p-2 shadow-[0_24px_90px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
        <a href="/" className="shrink-0 rounded-2xl bg-[#e50914] px-4 py-2 text-xs font-black text-white shadow-glow">DOFree Admin</a>
        {tabs.map((tab) => (
          <button key={tab.id} type="button" onClick={() => setActive(tab.id)} className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-black transition ${active === tab.id ? 'bg-white text-black' : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.14] hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
