import type { AdminFrontOptions } from '@/components/admin-front-manager-types';
import { adminInputClassSm, adminSelectClassSm } from '@/lib/admin-ui-classes';

type Props = {
  q: string;
  media: string;
  status: string;
  source: string;
  poster: string;
  section: string;
  options: AdminFrontOptions;
  loading?: boolean;
  onQueryChange: (value: string) => void;
  onMediaChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onPosterChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  onClear: () => void;
};

function label(value: string, type?: string) {
  if (value === 'all') return 'ทั้งหมด';
  if (type === 'media') {
    if (value === 'movie') return 'ภาพยนตร์';
    if (value === 'tv') return 'ซีรีส์';
  }
  if (type === 'status') {
    const labels: Record<string, string> = {
      missing: 'ไม่มีลิงก์',
      ready: 'พร้อมดู',
      draft: 'draft',
      review: 'รอตรวจ',
      published: 'published',
      broken: 'ลิงก์เสีย',
      hidden: 'ซ่อน',
      'no-trailer': 'ไม่มี trailer',
      'has-trailer': 'มี trailer',
    };
    return labels[value] || value;
  }
  if (type === 'poster') {
    if (value === 'with-poster') return 'มี poster';
    if (value === 'no-poster') return 'ไม่มี poster';
  }
  return value;
}

export function AdminFrontManagerSearch({
  q,
  media,
  status,
  source,
  poster,
  section,
  options,
  loading,
  onQueryChange,
  onMediaChange,
  onStatusChange,
  onSourceChange,
  onPosterChange,
  onSectionChange,
  onClear,
}: Props) {
  return (
    <section className="admin-floating-glass sticky top-2 z-30 rounded-2xl border border-white/10 p-3 md:top-4 md:rounded-[24px] md:p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <label className="relative block">
          <span className="sr-only">ค้นหา</span>
          <input
            value={q}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="ค้นหาชื่อไทย / อังกฤษ / TMDB ID / หมวดหมู่"
            className={`${adminInputClassSm} w-full rounded-2xl py-3 pl-4 pr-28 text-base`}
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
            {loading ? <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black text-white/62">Loading</span> : null}
            <button
              type="button"
              onClick={onClear}
              className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-black text-white/72 hover:bg-white/[0.14] hover:text-white"
            >
              Clear
            </button>
          </div>
        </label>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-5 lg:min-w-[700px]">
          <select value={media} onChange={(event) => onMediaChange(event.target.value)} className={adminSelectClassSm}>
            {options.media.map((value) => <option key={value} value={value}>{label(value, 'media')}</option>)}
          </select>
          <select value={status} onChange={(event) => onStatusChange(event.target.value)} className={adminSelectClassSm}>
            {options.statuses.map((value) => <option key={value} value={value}>{label(value, 'status')}</option>)}
          </select>
          <select value={source} onChange={(event) => onSourceChange(event.target.value)} className={adminSelectClassSm}>
            {options.sources.map((value) => <option key={value} value={value}>{label(value)}</option>)}
          </select>
          <select value={section} onChange={(event) => onSectionChange(event.target.value)} className={adminSelectClassSm}>
            {options.sections.map((value) => <option key={value} value={value}>{label(value)}</option>)}
          </select>
          <select value={poster} onChange={(event) => onPosterChange(event.target.value)} className={adminSelectClassSm}>
            {options.posters.map((value) => <option key={value} value={value}>{label(value, 'poster')}</option>)}
          </select>
        </div>
      </div>
    </section>
  );
}
