'use client';

import type { AdminFrontItem } from '@/components/admin-front-manager-types';

type Props = {
  item: AdminFrontItem | null;
  onClose: () => void;
  onSaved: (item: AdminFrontItem) => void;
};

export function AdminFrontManagerPanel({ item, onClose }: Props) {
  if (!item) return null;
  return (
    <aside className="fixed inset-y-0 right-0 z-[90] w-full max-w-xl border-l border-white/10 bg-[#050505] p-4 text-white shadow-2xl">
      <button type="button" onClick={onClose} className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white">ปิด</button>
      <h2 className="mt-4 text-2xl font-black">{item.title_th || item.title || `TMDB ${item.tmdb_id}`}</h2>
    </aside>
  );
}
