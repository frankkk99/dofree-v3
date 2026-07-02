import { getCatalogHomePayload, getCatalogSectionItems, HOME_SECTION_LIMIT, HOME_SECTION_LOAD_LIMIT, type CatalogSectionDef, catalogSectionDefs } from './catalog-home';
import { mediaDetailPath } from './seo';
import { supabaseRest } from './supabase-rest';
import { TMDB_RELEASE_SECTION_LIMIT } from './tmdb-release-window';
import type { HomePayload, MediaType, MovieItem, MovieSection } from './tmdb';

type CatalogRow = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  title_en?: string | null;
  overview?: string | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  rating?: number | string | null;
  vote_count?: number | string | null;
  popularity?: number | string | null;
  release_year?: string | null;
  release_date?: string | null;
  genres?: string[] | null;
  language?: string | null;
  runtime?: number | null;
  source_bucket?: string | null;
  sort_score?: number | string | null;
};

type WatchLinkRecord = {
  tmdb_id: number;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
};

type AdminCategoryRow = {
  slug: string;
  title_th: string;
  subtitle_th?: string | null;
  enabled: boolean;
  sort_order: number;
  media_type?: string | null;
  tmdb_params?: Record<string, unknown> | null;
};

const catalogSelect = 'tmdb_id,media_type,title,title_en,overview,poster_url,backdrop_url,rating,vote_count,popularity,release_year,release_date,genres,language,runtime,source_bucket,sort_score';
const fallbackImage = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80';
const publicRevalidate = 300;

type ManagedSection = CatalogSectionDef & { source: 'admin' | 'fallback' };

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : undefined;
}

function sortValue(value: unknown): CatalogSectionDef['sort'] | undefined {
  return value === 'score' || value === 'popular' || value === 'rating' || value === 'recent' ? value : undefined;
}

function mediaTypeValue(value: unknown): MediaType | undefined {
  return value === 'movie' || value === 'tv' ? value : undefined;
}

function mediaTypeFromParams(params: Record<string, unknown>, rowMediaType?: string | null, fallback?: MediaType) {
  if (Object.prototype.hasOwnProperty.call(params, 'mediaType')) return mediaTypeValue(params.mediaType);
  return mediaTypeValue(rowMediaType) || fallback;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function findDefaultSection(slug: string) {
  return catalogSectionDefs.find((section) => section.slug === slug) || null;
}

function adminRowToSection(row: AdminCategoryRow, index = 0): ManagedSection {
  const fallback = findDefaultSection(row.slug);
  const params = row.tmdb_params || {};
  const sourceBuckets = arrayOfStrings(params.sourceBuckets) || fallback?.sourceBuckets || [row.slug];
  const languages = arrayOfStrings(params.languages) || fallback?.languages;
  const genreKeywords = arrayOfStrings(params.genreKeywords) || fallback?.genreKeywords;
  const mediaType = mediaTypeFromParams(params, row.media_type, fallback?.mediaType);
  const minRating = numberValue(params.minRating) ?? fallback?.minRating ?? 0;
  const sort = sortValue(params.sort) || fallback?.sort || 'popular';

  return {
    slug: row.slug,
    eyebrow: fallback?.eyebrow || String(params.eyebrow || row.slug),
    title: row.title_th || fallback?.title || row.slug,
    description: row.subtitle_th || fallback?.description || 'หมวดจากหลังบ้านที่เชื่อมกับข้อมูล catalog ที่ Sync เข้ามาแล้ว',
    limit: numberValue(params.limit) || fallback?.limit || HOME_SECTION_LIMIT,
    offset: numberValue(params.offset) || fallback?.offset || index * 160,
    mediaType,
    sourceBuckets,
    languages,
    genreKeywords,
    minRating,
    sort,
    source: 'admin',
  };
}

function orderByForSection(section: Pick<CatalogSectionDef, 'sort'>) {
  if (section.sort === 'rating') return 'rating.desc.nullslast,vote_count.desc.nullslast,sort_score.desc.nullslast';
  if (section.sort === 'recent') return 'release_date.desc.nullslast,sort_score.desc.nullslast';
  if (section.sort === 'popular') return 'popularity.desc.nullslast,sort_score.desc.nullslast';
  return 'sort_score.desc.nullslast,rating.desc';
}

function inList(values: string[]) {
  return values.map((value) => encodeURIComponent(value)).join(',');
}

function rowText(row: CatalogRow) {
  return [row.title, row.title_en, row.overview, row.source_bucket, row.language, ...(row.genres || [])].filter(Boolean).join(' ').toLowerCase();
}

function rowMatchesSection(row: CatalogRow, section: CatalogSectionDef) {
  if (section.mediaType && row.media_type !== section.mediaType) return false;
  if (Number(row.rating || 0) < (section.minRating ?? 0)) return false;

  const sourceBucket = String(row.source_bucket || '').toLowerCase();
  const language = String(row.language || '').toLowerCase();
  const text = rowText(row);
  const sourceMatch = !section.sourceBuckets?.length || section.sourceBuckets.some((bucket) => sourceBucket === bucket.toLowerCase());
  const languageMatch = !section.languages?.length || section.languages.some((value) => language === value.toLowerCase());
  const genreMatch = !section.genreKeywords?.length || section.genreKeywords.some((keyword) => text.includes(keyword.toLowerCase()));

  if (section.sourceBuckets?.length && (section.languages?.length || section.genreKeywords?.length)) return sourceMatch || languageMatch || genreMatch;
  return sourceMatch && languageMatch && genreMatch;
}

function uniqueRows(rows: CatalogRow[]) {
  const map = new Map<string, CatalogRow>();
  for (const row of rows) map.set(`${row.media_type}-${row.tmdb_id}`, row);
  return [...map.values()];
}

function normalizeDrivePreviewUrl(value?: string | null) {
  const url = value?.trim();
  if (!url) return undefined;
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (url.includes('drive.google.com') && openMatch?.[1]) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  return url;
}

function watchKey(mediaType: MediaType, id: number) {
  return `${mediaType}-${id}`;
}

function badges(item: Pick<MovieItem, 'rating' | 'language' | 'isWatchReady'>) {
  const items: string[] = [];
  if (item.isWatchReady) items.push('พร้อมดู', 'HD');
  if (item.rating >= 8) items.push('8+');
  if (item.rating >= 6.5) items.push('6.5+');
  if (item.language === 'th') items.push('พากย์ไทย');
  return items.slice(0, 3);
}

async function fetchWatchLinks(rows: CatalogRow[]) {
  const ids = [...new Set(rows.map((row) => Number(row.tmdb_id)).filter(Boolean))];
  const map = new Map<string, WatchLinkRecord>();
  if (!ids.length) return map;
  const links = await supabaseRest<WatchLinkRecord[]>(
    `admin_movie_links?is_active=eq.true&tmdb_id=in.(${ids.join(',')})&select=tmdb_id,media_type,title,title_th,watch_url,trailer_url`,
    { mode: 'service', next: { revalidate: publicRevalidate } },
  ).catch(() => []);
  for (const link of links || []) {
    if (!link.tmdb_id || !link.media_type) continue;
    map.set(watchKey(link.media_type, Number(link.tmdb_id)), link);
  }
  return map;
}

function rowToMovie(row: CatalogRow, link: WatchLinkRecord | undefined, index: number): MovieItem {
  const rating = Number(row.rating || 0);
  const watchUrl = normalizeDrivePreviewUrl(link?.watch_url);
  const trailerUrl = normalizeDrivePreviewUrl(link?.trailer_url);
  const title = link?.title_th || link?.title || row.title_en || row.title || `รายการ ${row.tmdb_id}`;
  const item: MovieItem = {
    id: Number(row.tmdb_id),
    mediaType: row.media_type,
    title,
    titleEn: link?.title || row.title_en || row.title || undefined,
    overview: row.overview || 'ค้นพบเรื่องราวใหม่ พร้อมข้อมูลภาพยนตร์ ตัวอย่าง นักแสดง และสถานะการรับชมที่ชัดเจน',
    posterUrl: row.poster_url || fallbackImage,
    backdropUrl: row.backdrop_url || row.poster_url || fallbackImage,
    rating,
    year: row.release_year || (row.release_date ? row.release_date.slice(0, 4) : 'ไม่ระบุ'),
    genres: row.genres || [],
    runtime: row.runtime || undefined,
    language: row.language || undefined,
    status: watchUrl ? 'published' : rating >= 8 ? 'review' : 'draft',
    isWatchReady: Boolean(watchUrl),
    watchUrl: watchUrl ? mediaDetailPath(row.media_type, row.tmdb_id, title, 'watch') : undefined,
    trailerUrl,
    label: watchUrl ? 'พร้อมดู' : rating >= 8 ? '8+' : '6.5+',
  };
  return { ...item, badges: badges(item), searchText: rowText(row) } as MovieItem;
}

async function hydrateManagedRows(rows: CatalogRow[], startIndex = 0) {
  const links = await fetchWatchLinks(rows);
  return rows.map((row, index) => rowToMovie(row, links.get(watchKey(row.media_type, row.tmdb_id)), startIndex + index));
}

async function rowsForManagedSection(section: CatalogSectionDef, limit: number, offset = 0) {
  const fetchLimit = Math.min(Math.max(offset + limit * 8, limit + 80), 960);
  const filters = ['is_active=eq.true', 'poster_url=not.is.null', `rating=gte.${section.minRating ?? 0}`];

  if (section.mediaType) filters.push(`media_type=eq.${section.mediaType}`);
  if (section.sourceBuckets?.length === 1) filters.push(`source_bucket=eq.${encodeURIComponent(section.sourceBuckets[0])}`);
  if (section.sourceBuckets && section.sourceBuckets.length > 1) filters.push(`source_bucket=in.(${inList(section.sourceBuckets)})`);
  if (section.languages?.length === 1 && !section.sourceBuckets?.length) filters.push(`language=eq.${encodeURIComponent(section.languages[0])}`);
  if (section.languages && section.languages.length > 1 && !section.sourceBuckets?.length) filters.push(`language=in.(${inList(section.languages)})`);

  const directRows = await supabaseRest<CatalogRow[]>(
    `tmdb_catalog?select=${catalogSelect}&${filters.join('&')}&order=${orderByForSection(section)}&limit=${fetchLimit}`,
    { mode: 'service', next: { revalidate: publicRevalidate } },
  ).catch(() => []);

  let rows = uniqueRows(directRows).filter((row) => rowMatchesSection(row, section));

  if (rows.length < offset + limit && (section.genreKeywords?.length || section.languages?.length)) {
    const broadFilters = ['is_active=eq.true', 'poster_url=not.is.null', `rating=gte.${section.minRating ?? 0}`, section.mediaType ? `media_type=eq.${section.mediaType}` : ''].filter(Boolean);
    const fallbackRows = await supabaseRest<CatalogRow[]>(
      `tmdb_catalog?select=${catalogSelect}&${broadFilters.join('&')}&order=${orderByForSection(section)}&limit=${fetchLimit}`,
      { mode: 'service', next: { revalidate: publicRevalidate } },
    ).catch(() => []);
    rows = uniqueRows([...rows, ...fallbackRows.filter((row) => rowMatchesSection(row, section))]);
  }

  return rows.slice(offset, offset + limit);
}

async function adminCategoryRows() {
  return supabaseRest<AdminCategoryRow[]>(
    'admin_categories?select=slug,title_th,subtitle_th,enabled,sort_order,media_type,tmdb_params&enabled=eq.true&order=sort_order.asc',
    { mode: 'service', next: { revalidate: publicRevalidate } },
  ).catch(() => []);
}

async function itemsForManagedSection(section: ManagedSection, limit = HOME_SECTION_LOAD_LIMIT, offset = 0) {
  const safeLimit = Math.min(Math.max(Number(limit) || HOME_SECTION_LOAD_LIMIT, 1), section.slug === 'coming-soon' ? TMDB_RELEASE_SECTION_LIMIT : 24);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  if (section.slug === 'watch-ready' || section.slug === 'random-picks' || section.slug === 'coming-soon') return getCatalogSectionItems(section.slug, safeLimit, safeOffset);
  const rows = await rowsForManagedSection(section, safeLimit, safeOffset);
  return hydrateManagedRows(rows, safeOffset);
}

export async function getManagedCatalogSectionItems(slug: string, limit = HOME_SECTION_LOAD_LIMIT, offset = 0) {
  const rows = await supabaseRest<AdminCategoryRow[]>(
    `admin_categories?select=slug,title_th,subtitle_th,enabled,sort_order,media_type,tmdb_params&slug=eq.${encodeURIComponent(slug)}&limit=1`,
    { mode: 'service', next: { revalidate: publicRevalidate } },
  ).catch(() => []);
  const adminRow = rows?.find((row) => row.enabled !== false);
  if (adminRow) return itemsForManagedSection(adminRowToSection(adminRow), limit, offset);

  const fallback = findDefaultSection(slug);
  if (fallback) return getCatalogSectionItems(slug, limit, offset);
  return [];
}

export async function getManagedCatalogHomePayload(): Promise<HomePayload> {
  const [base, adminRows] = await Promise.all([getCatalogHomePayload(), adminCategoryRows()]);
  if (!adminRows.length) return base;

  const managedSections = adminRows.map(adminRowToSection);
  const rowsBySection = await Promise.all(managedSections.map((section) => itemsForManagedSection(section, section.limit, 0)));
  const sections: MovieSection[] = managedSections
    .map((section, index) => ({
      slug: section.slug,
      eyebrow: section.eyebrow,
      title: section.title,
      description: section.description,
      items: rowsBySection[index] || [],
    }))
    .filter((section) => section.items.length);

  if (!sections.length) return base;

  const heroItems = sections.flatMap((section) => section.items).filter((item) => item.backdropUrl && item.rating >= 6.5).slice(0, 6);
  return {
    ...base,
    source: 'tmdb',
    hero: heroItems[0] || base.hero,
    heroItems: heroItems.length ? heroItems : base.heroItems,
    sections,
  };
}

export function catalogSectionParams(section: CatalogSectionDef) {
  return {
    sourceBuckets: section.sourceBuckets || [],
    languages: section.languages || [],
    genreKeywords: section.genreKeywords || [],
    mediaType: section.mediaType || null,
    minRating: section.minRating ?? null,
    sort: section.sort || 'popular',
    limit: section.limit || HOME_SECTION_LIMIT,
    offset: section.offset || 0,
    eyebrow: section.eyebrow,
  };
}
