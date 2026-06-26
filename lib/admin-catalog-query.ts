import { categoryChips } from '@/lib/catalog';
import { supabaseRest } from '@/lib/supabase-rest';

export type MediaType = 'movie' | 'tv';
export type MovieStatus = 'draft' | 'review' | 'published' | 'broken' | 'hidden';

export type CatalogRow = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  title_en?: string | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  rating?: number | string | null;
  release_year?: string | null;
  release_date?: string | null;
  genres?: string[] | null;
  language?: string | null;
  runtime?: number | null;
  source_bucket?: string | null;
  updated_at?: string | null;
};

export type SavedLink = {
  id?: string;
  tmdb_id: number;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  is_active?: boolean;
  notes?: string | null;
  section_slug?: string;
  status?: MovieStatus;
  created_at?: string;
  updated_at?: string;
};

export type AdminCatalogItem = {
  id: string;
  tmdb_id: number;
  media_type: MediaType;
  title: string | null;
  title_th: string | null;
  watch_url: string | null;
  trailer_url: string | null;
  provider: string | null;
  is_active: boolean;
  notes: string | null;
  section_slug: string;
  status: MovieStatus;
  created_at?: string;
  updated_at?: string;
  poster_url: string | null;
  backdrop_url: string | null;
  rating: number;
  year?: string;
  release_date?: string | null;
  month?: string;
  language?: string;
  runtime: number | null;
  genres: string[];
  source_bucket: string;
  source_buckets: string[];
};

export type AdminCatalogFilters = {
  q: string;
  source: string;
  media: string;
  status: string;
  sort: string;
  poster: string;
  genre: string;
  year: string;
  month: string;
  language: string;
  provider: string;
  section: string;
  minRating: string;
  maxRating: string;
  view: string;
};

export const defaultAdminCatalogFilters: AdminCatalogFilters = {
  q: '',
  source: 'all',
  media: 'all',
  status: 'all',
  sort: 'rating',
  poster: 'with-poster',
  genre: 'all',
  year: 'all',
  month: 'all',
  language: 'all',
  provider: 'all',
  section: 'all',
  minRating: '',
  maxRating: '',
  view: 'unique',
};

export const adminCategoryOptions = categoryChips.filter((chip) => chip !== 'ทั้งหมด');

const sourceLabels: Record<string, string[]> = {
  'watch-ready': ['พร้อมดู'],
  'top-rated': ['คะแนนสูง'],
  popular: ['ยอดนิยม'],
  'now-playing': ['หนังใหม่', 'มาใหม่'],
  series: ['ซีรีส์'],
  thai: ['หนังไทย', 'ไทย'],
  action: ['แอ็กชัน', 'action'],
  horror: ['สยองขวัญ', 'horror'],
  comedy: ['คอมเมดี้', 'comedy'],
  korea: ['เกาหลี'],
  japan: ['ญี่ปุ่น'],
  china: ['จีน'],
  documentary: ['สารคดี', 'documentary'],
};

const genreAliases: Record<string, string[]> = {
  หนังไทย: ['thai', 'ไทย'],
  หนังฝรั่ง: ['en', 'us', 'english', 'ฝรั่ง'],
  พากย์ไทย: ['พากย์ไทย', 'thai dub', 'dubbed', 'th'],
  ซับไทย: ['ซับไทย', 'subtitle', 'sub thai'],
  พร้อมดู: ['watch-ready', 'published'],
  คะแนนสูง: ['top-rated', 'rating'],
  หนังใหม่: ['now-playing', 'ใหม่'],
  ภาพยนตร์: ['movie'],
  ซีรีส์: ['tv', 'series', 'ซีรีส์'],
  แอ็กชัน: ['action', 'แอ็กชัน', 'แอ็คชัน'],
  ดราม่า: ['drama', 'ดราม่า'],
  ระทึกขวัญ: ['thriller', 'ระทึกขวัญ'],
  โรแมนติก: ['romance', 'romantic', 'โรแมนติก'],
  คอมเมดี้: ['comedy', 'คอมเมดี้', 'ตลก'],
  สยองขวัญ: ['horror', 'สยองขวัญ'],
  ไซไฟ: ['sci-fi', 'science fiction', 'ไซไฟ'],
  แฟนตาซี: ['fantasy', 'แฟนตาซี'],
  สารคดี: ['documentary', 'สารคดี'],
  อาชญากรรม: ['crime', 'อาชญากรรม'],
  ลึกลับ: ['mystery', 'ลึกลับ'],
  ผจญภัย: ['adventure', 'ผจญภัย'],
  แอนิเมชัน: ['animation', 'animated', 'แอนิเมชัน'],
};

export function catalogKey(mediaType: MediaType, id: number) {
  return `${mediaType}-${id}`;
}

export function normalize(value: unknown) {
  return String(value || '').toLowerCase().trim();
}

export function csvCell(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function csvLine(values: unknown[]) {
  return values.map(csvCell).join(',');
}

export function parseAdminCatalogFilters(params: URLSearchParams): AdminCatalogFilters {
  return {
    q: params.get('q')?.trim() || defaultAdminCatalogFilters.q,
    source: params.get('source')?.trim() || defaultAdminCatalogFilters.source,
    media: params.get('media')?.trim() || defaultAdminCatalogFilters.media,
    status: params.get('status')?.trim() || defaultAdminCatalogFilters.status,
    sort: params.get('sort')?.trim() || defaultAdminCatalogFilters.sort,
    poster: params.get('poster')?.trim() || defaultAdminCatalogFilters.poster,
    genre: params.get('genre')?.trim() || defaultAdminCatalogFilters.genre,
    year: params.get('year')?.trim() || defaultAdminCatalogFilters.year,
    month: params.get('month')?.trim() || defaultAdminCatalogFilters.month,
    language: params.get('language')?.trim() || defaultAdminCatalogFilters.language,
    provider: params.get('provider')?.trim() || defaultAdminCatalogFilters.provider,
    section: params.get('section')?.trim() || defaultAdminCatalogFilters.section,
    minRating: params.get('minRating')?.trim() || defaultAdminCatalogFilters.minRating,
    maxRating: params.get('maxRating')?.trim() || defaultAdminCatalogFilters.maxRating,
    view: params.get('view')?.trim() || defaultAdminCatalogFilters.view,
  };
}

function monthFromDate(value?: string | null) {
  if (!value) return '';
  const match = value.match(/^\d{4}-(\d{2})/);
  return match?.[1] || '';
}

function sourceSet(row: CatalogRow, saved?: SavedLink) {
  const values = [row.source_bucket, saved?.section_slug].filter(Boolean).map(String);
  return Array.from(new Set(values));
}

function merge(row: CatalogRow, saved?: SavedLink): AdminCatalogItem {
  const watchUrl = saved?.watch_url?.trim() || null;
  const sourceBuckets = sourceSet(row, saved);
  return {
    id: saved?.id || '',
    tmdb_id: row.tmdb_id,
    media_type: row.media_type,
    title: saved?.title || row.title_en || row.title || null,
    title_th: saved?.title_th || row.title || row.title_en || null,
    watch_url: watchUrl,
    trailer_url: saved?.trailer_url || null,
    provider: saved?.provider || null,
    is_active: saved?.is_active ?? true,
    notes: saved?.notes || null,
    section_slug: saved?.section_slug || row.source_bucket || 'top-rated',
    status: watchUrl ? 'published' : saved?.status || 'draft',
    created_at: saved?.created_at,
    updated_at: saved?.updated_at || row.updated_at || undefined,
    poster_url: row.poster_url || null,
    backdrop_url: row.backdrop_url || null,
    rating: Number(row.rating || 0),
    year: row.release_year || undefined,
    release_date: row.release_date || null,
    month: monthFromDate(row.release_date),
    language: row.language || undefined,
    runtime: row.runtime || null,
    genres: row.genres || [],
    source_bucket: row.source_bucket || saved?.section_slug || 'top-rated',
    source_buckets: sourceBuckets.length ? sourceBuckets : ['top-rated'],
  };
}

function mergeDuplicateItems(items: AdminCatalogItem[]) {
  const map = new Map<string, AdminCatalogItem>();
  for (const item of items) {
    const key = catalogKey(item.media_type, item.tmdb_id);
    const current = map.get(key);
    if (!current) {
      map.set(key, { ...item, genres: [...item.genres], source_buckets: [...item.source_buckets] });
      continue;
    }

    current.source_buckets = Array.from(new Set([...current.source_buckets, ...item.source_buckets, item.source_bucket]));
    current.genres = Array.from(new Set([...current.genres, ...item.genres]));
    current.rating = Math.max(current.rating, item.rating);
    current.poster_url ||= item.poster_url;
    current.backdrop_url ||= item.backdrop_url;
    current.release_date ||= item.release_date;
    current.year ||= item.year;
    current.month ||= item.month;
    current.language ||= item.language;
    current.runtime ||= item.runtime;
    current.updated_at = [current.updated_at, item.updated_at].filter(Boolean).sort().reverse()[0];
  }
  return [...map.values()];
}

async function loadSavedLinks() {
  const map = new Map<string, SavedLink>();
  for (let offset = 0; offset < 10000; offset += 1000) {
    const rows = await supabaseRest<SavedLink[]>(`admin_movie_links?select=id,tmdb_id,media_type,title,title_th,watch_url,trailer_url,provider,is_active,notes,section_slug,status,created_at,updated_at&limit=1000&offset=${offset}`, { mode: 'service', cache: 'no-store' });
    for (const row of rows || []) map.set(catalogKey(row.media_type, row.tmdb_id), row);
    if (!rows?.length || rows.length < 1000) break;
  }
  return map;
}

async function loadCatalogRows(maxRows = 15000) {
  const rows: CatalogRow[] = [];
  for (let offset = 0; offset < maxRows; offset += 1000) {
    const page = await supabaseRest<CatalogRow[]>(`tmdb_catalog?select=tmdb_id,media_type,title,title_en,poster_url,backdrop_url,rating,release_year,release_date,genres,language,runtime,source_bucket,updated_at&is_active=eq.true&order=sort_score.desc.nullslast,rating.desc&limit=1000&offset=${offset}`, { mode: 'service', cache: 'no-store' });
    rows.push(...(page || []));
    if (!page?.length || page.length < 1000) break;
  }
  return rows;
}

export async function loadAdminCatalogItems(view = 'unique') {
  const [rows, saved] = await Promise.all([loadCatalogRows(), loadSavedLinks()]);
  const merged = (rows || [])
    .filter((row) => row.tmdb_id && row.media_type)
    .map((row) => merge(row, saved.get(catalogKey(row.media_type, row.tmdb_id))));
  return view === 'rows' ? merged : mergeDuplicateItems(merged);
}

function statusMatch(item: AdminCatalogItem, status: string) {
  if (status === 'missing') return !item.watch_url;
  if (status === 'ready') return Boolean(item.watch_url);
  if (status === 'review') return item.status === 'review' || item.status === 'draft';
  if (status === 'draft') return item.status === 'draft';
  if (status === 'published') return item.status === 'published' || Boolean(item.watch_url);
  if (status === 'broken') return item.status === 'broken';
  if (status === 'hidden') return item.status === 'hidden' || item.is_active === false;
  if (status === 'no-trailer') return !item.trailer_url;
  if (status === 'has-trailer') return Boolean(item.trailer_url);
  return true;
}

function posterMatch(item: AdminCatalogItem, value: string) {
  if (value === 'with-poster') return Boolean(item.poster_url);
  if (value === 'no-poster') return !item.poster_url;
  return true;
}

function queryText(item: AdminCatalogItem) {
  return normalize([
    item.tmdb_id,
    item.media_type,
    item.title,
    item.title_th,
    item.year,
    item.release_date,
    item.month,
    item.language,
    item.provider,
    item.notes,
    item.section_slug,
    item.source_bucket,
    item.status,
    ...item.source_buckets,
    ...item.genres,
  ].filter(Boolean).join(' '));
}

function queryMatch(item: AdminCatalogItem, q: string) {
  const keyword = normalize(q);
  if (!keyword) return true;
  return queryText(item).includes(keyword);
}

function categoryMatch(item: AdminCatalogItem, genre: string) {
  if (!genre || genre === 'all') return true;
  if (genre === 'พร้อมดู') return Boolean(item.watch_url);
  if (genre === 'คะแนนสูง') return item.rating >= 8;
  if (genre === 'หนังใหม่') return Number(item.year || 0) >= new Date().getFullYear() - 1 || item.source_buckets.includes('now-playing');
  if (genre === 'ภาพยนตร์') return item.media_type === 'movie';
  if (genre === 'ซีรีส์') return item.media_type === 'tv';
  if (genre === 'หนังไทย') return normalize(item.language) === 'th' || queryText(item).includes('ไทย');
  if (genre === 'หนังฝรั่ง') return ['en', 'us'].includes(normalize(item.language)) || queryText(item).includes('english');

  const haystack = queryText(item);
  const aliases = genreAliases[genre] || [genre];
  return aliases.some((alias) => haystack.includes(normalize(alias))) || item.genres.some((rowGenre) => normalize(rowGenre).includes(normalize(genre)));
}

function rangeMatch(value: number, minRaw: string, maxRaw: string) {
  const min = minRaw ? Number(minRaw) : Number.NEGATIVE_INFINITY;
  const max = maxRaw ? Number(maxRaw) : Number.POSITIVE_INFINITY;
  if (Number.isFinite(min) && value < min) return false;
  if (Number.isFinite(max) && value > max) return false;
  return true;
}

export function filterAdminCatalogItems(items: AdminCatalogItem[], filters: AdminCatalogFilters) {
  return items
    .filter((item) => queryMatch(item, filters.q))
    .filter((item) => filters.source === 'all' || item.source_buckets.includes(filters.source) || item.source_bucket === filters.source)
    .filter((item) => filters.media === 'all' || item.media_type === filters.media)
    .filter((item) => statusMatch(item, filters.status))
    .filter((item) => posterMatch(item, filters.poster))
    .filter((item) => categoryMatch(item, filters.genre))
    .filter((item) => filters.year === 'all' || item.year === filters.year)
    .filter((item) => filters.month === 'all' || item.month === filters.month)
    .filter((item) => filters.language === 'all' || normalize(item.language) === normalize(filters.language))
    .filter((item) => filters.provider === 'all' || normalize(item.provider) === normalize(filters.provider))
    .filter((item) => filters.section === 'all' || item.section_slug === filters.section)
    .filter((item) => rangeMatch(item.rating || 0, filters.minRating, filters.maxRating));
}

export function sortAdminCatalogItems(items: AdminCatalogItem[], sort: string) {
  return [...items].sort((a, b) => {
    if (sort === 'newest') return String(b.release_date || b.year || '').localeCompare(String(a.release_date || a.year || '')) || b.rating - a.rating;
    if (sort === 'oldest') return String(a.release_date || a.year || '').localeCompare(String(b.release_date || b.year || '')) || b.rating - a.rating;
    if (sort === 'updated') return String(b.updated_at || '').localeCompare(String(a.updated_at || '')) || b.rating - a.rating;
    if (sort === 'title') return String(a.title_th || a.title || '').localeCompare(String(b.title_th || b.title || ''), 'th');
    return b.rating - a.rating || String(a.title_th || a.title || '').localeCompare(String(b.title_th || b.title || ''), 'th');
  });
}

function optionValues(items: AdminCatalogItem[], selector: (item: AdminCatalogItem) => string | string[] | undefined | null) {
  const values = new Set<string>();
  for (const item of items) {
    const raw = selector(item);
    const list = Array.isArray(raw) ? raw : [raw];
    for (const value of list) {
      if (value) values.add(value);
    }
  }
  return [...values].sort((a, b) => a.localeCompare(b, 'th'));
}

export function getAdminCatalogFilterOptions(items: AdminCatalogItem[]) {
  return {
    sources: ['all', ...optionValues(items, (item) => item.source_buckets)],
    sections: ['all', ...optionValues(items, (item) => item.section_slug)],
    genres: ['all', ...adminCategoryOptions, ...optionValues(items, (item) => item.genres).filter((item) => !adminCategoryOptions.includes(item))],
    years: ['all', ...optionValues(items, (item) => item.year).sort((a, b) => b.localeCompare(a))],
    months: ['all', ...optionValues(items, (item) => item.month).sort()],
    languages: ['all', ...optionValues(items, (item) => item.language)],
    providers: ['all', ...optionValues(items, (item) => item.provider)],
    statuses: ['all', 'missing', 'ready', 'draft', 'review', 'published', 'broken', 'hidden', 'no-trailer', 'has-trailer'],
    media: ['all', 'movie', 'tv'],
    posters: ['with-poster', 'all', 'no-poster'],
  };
}

export const adminExportHeader = [
  'No',
  'TMDB ID',
  'Media Type',
  'Title TH',
  'Title EN',
  'Rating',
  'Year',
  'Release Date',
  'Month',
  'Language',
  'Runtime',
  'Genres',
  'Source Buckets',
  'Section',
  'Status',
  'Provider',
  'Has Watch URL',
  'Watch URL',
  'Trailer URL',
  'Poster URL',
  'Backdrop URL',
  'Notes',
  'Updated At',
];

export function adminCatalogExportRow(item: AdminCatalogItem, index: number) {
  return [
    index + 1,
    item.tmdb_id,
    item.media_type,
    item.title_th || '',
    item.title || '',
    item.rating || '',
    item.year || '',
    item.release_date || '',
    item.month || '',
    item.language || '',
    item.runtime || '',
    item.genres.join(' / '),
    item.source_buckets.join(' / '),
    item.section_slug || '',
    item.status || '',
    item.provider || '',
    item.watch_url ? 'yes' : 'no',
    item.watch_url || '',
    item.trailer_url || '',
    item.poster_url || '',
    item.backdrop_url || '',
    item.notes || '',
    item.updated_at || '',
  ];
}
