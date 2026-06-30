import type { AdminFrontItem } from '@/components/admin-front-manager-types';

type Props = {
  item: AdminFrontItem;
  onSelect: (item: AdminFrontItem) => void;
};

export function AdminFrontManagerCard({ item, onSelect }: Props) {
  return (
    <button type="button" onClick={() => onSelect(item)} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left text-white">
      {item.title_th || item.title || `TMDB ${item.tmdb_id}`}
    </button>
  );
}
