import { supabaseRest } from './supabase-rest';
import { episodeWatchHref, getSeriesEpisodeSummaries } from './series-episodes';
import { getFreshComingSoonItems } from './tmdb-release-window';
import { getHomePayload as getTmdbHomePayload, type HomePayload, type MediaType, type MovieItem, type MovieSection } from './tmdb';

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

type SectionDef = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  limit: number;
  offset: number;
};

type EpisodeSummaryLookup = Awaited<ReturnType<typeof getSeriesEpisodeSummaries>>;

export const HOME_SECTION_LIMIT = 18;
export const HOME_SECTION_LOAD_LIMIT = 9;
const HOME_HERO_LIMIT = 6;
const PUBLIC_CATALOG_REVALIDATE = 300;
const minRating = 6.5;
const fallbackImage = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80';

const sectionDefs: SectionDef[] = [
  { slug: 'top-rated', eyebrow: 'คะแนนสูง', title: 'คะแนน 6.5+ น่าดู', description: 'คัดจาก catalog เรียงคะแนนและความนิยม', limit: HOME_SECTION_LIMIT, offset: 0 },
  { slug: 'popular', eyebrow: 'กำลังนิยม', title: 'ยอดนิยมคะแนนดี', description: 'หนังยอดนิยมที่คะแนนผ่านเกณฑ์', limit: HOME_SECTION_LIMIT, offset: 200 },
  { slug: 'now-playing', eyebrow: 'มาใหม่', title: 'ภาพยนตร์มาใหม่คะแนนดี', description: 'หนังใหม่ที่พร้อมขึ้นหน้าแรก', limit: HOME_SECTION_LIMIT, offset: 400 },
  { slug: 'series', eyebrow: 'ซีรีส์', title: 'ซีรีส์น่าติดตาม', description: 'ซีรีส์คะแนนดีจาก catalog', limit: HOME_SECTION_LIMIT, offset: 540 },
  { slug: 'thai', eyebrow: 'Local Focus', title: 'หนังไทยคะแนนดี', description: 'หนังไทยสำหรับตลาดไทยและ SEO', limit: HOME_SECTION_LIMIT, offset: 700 },
  { slug: 'action', eyebrow: 'Action', title: 'แอ็กชัน', description: 'หนังแอ็กชันจังหวะเร็ว', limit: HOME_SECTION_LIMIT, offset: 860 },
  { slug: 'adventure', eyebrow: 'Adventure', title: 'ผจญภัย', description: 'หนังเดินทางและโลกกว้าง', limit: HOME_SECTION_LIMIT, offset: 980 },
  { slug: 'animation', eyebrow: 'Animation', title: 'แอนิเมชัน', description: 'แอนิเมชันคะแนนดีสำหรับทุกวัย', limit: HOME_SECTION_LIMIT, offset: 1100 },
  { slug: 'drama', eyebrow: 'Drama', title: 'ดราม่า', description: 'ดราม่าที่มีอารมณ์และตัวละครชัด', limit: HOME_SECTION_LIMIT, offset: 1220 },
  { slug: 'thriller', eyebrow: 'Thriller', title: 'ระทึกขวัญ', description: 'หนังลุ้นและเข้มข้น', limit: HOME_SECTION_LIMIT, offset: 1340 },
  { slug: 'horror', eyebrow: 'Horror', title: 'สยองขวัญ', description: 'หนังสยองสำหรับโทนมืดของเว็บ', limit: HOME_SECTION_LIMIT, offset: 1460 },
  { slug: 'comedy', eyebrow: 'Comedy', title: 'คอมเมดี้', description: 'หนังดูง่ายและเบรกอารมณ์', limit: HOME_SECTION_LIMIT, offset: 1580 },
  { slug: 'sci-fi', eyebrow: 'Sci-Fi', title: 'ไซไฟ', description: 'หนังโลกอนาคตและจินตนาการ', limit: HOME_SECTION_LIMIT, offset: 1700 },
  { slug: 'romance', eyebrow: 'Romance', title: 'โรแมนติก', description: 'หนังรักและความสัมพันธ์', limit: HOME_SECTION_LIMIT, offset: 1820 },
  { slug: 'fantasy', eyebrow: 'Fantasy', title: 'แฟนตาซี', description: 'โลกเหนือจริงและการผจญภัย', limit: HOME_SECTION_LIMIT, offset: 1940 },
  { slug: 'crime', eyebrow: 'Crime', title: 'อาชญากรรม', description: 'หนังอาชญากรรมและการสืบสวน', limit: HOME_SECTION_LIMIT, offset: 2060 },
  { slug: 'mystery', eyebrow: 'Mystery', title: 'ลึกลับ', description: 'หนังปริศนาและความลับ', limit: HOME_SECTION_LIMIT, offset: 2180 },
  { slug: 'korea', eyebrow: 'Korea', title: 'หนังเกาหลี', description: 'คัดหนังเกาหลีคะแนนดี', limit: HOME_SECTION_LIMIT, offset: 2300 },
  { slug: 'japan', eyebrow: 'Japan', title: 'หนังญี่ปุ่น', description: 'คัดหนังญี่ปุ่นคะแนนดี', limit: HOME_SECTION_LIMIT, offset: 2420 },
  { slug: 'china', eyebrow: 'China', title: 'หนังจีน', description: 'คัดหนังจีนคะแนนดี', limit: HOME_SECTION_LIMIT, offset: 2540 },
  { slug: 'documentary', eyebrow: 'Documentary', title: 'สารคดี', description: 'สารคดีและเรื่องจริง', limit: HOME_SECTION_LIMIT, offset: 2660 },
];

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
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

function publicWatchUrl(item: Pick<MovieItem, 'mediaType' | 'id'>) {
  return `/watch/${item.mediaType}/${item.id}`;
}

function badges(item: Pick<MovieItem, 'rating' | 'language' | 'isWatchReady'>, index: number) {
  const items: string[] = [];
  if (item.isWatchReady) items.push('พร้อมดู');
  if (item.rating >= 8) items.push('8+');
  if (item.rating >= minRating) items.push('6.5+');
  if (index < 4) items.push('ใหม่');
  if (item.language === 'th') items.push('พากย์ไทย');
  items.push('HD');
  return items.slice(0, 3);
}

function hiddenSearchAliases(text: string) {
  const source = text.toLowerCase();
  const terms: string[] = [];

  if (/(race|racing|car|cars|drive|driving|driver|speed|fast|furious|drift|motor|formula|vehicle|road)/.test(source)) {
    terms.push('หนังที่ขับรถแข่งกัน', 'ขับรถแข่งกัน', 'ขับรถแข่ง', 'แข่งรถ', 'รถแข่ง', 'รถซิ่ง', 'ซิ่ง', 'ดริฟต์', 'racing movie', 'car racing', 'speed racing');
  }
  if (/(fight|fighting|martial|war|soldier|battle|mission|spy|agent|revenge|gun|weapon|action)/.test(source)) {
    terms.push('หนังต่อสู้', 'หนังบู๊', 'หนังแอ็กชัน', 'ยิงกัน', 'ภารกิจ', 'สายลับ');
  }
  if (/(ghost|haunted|horror|demon|curse|evil|spirit|supernatural|zombie)/.test(source)) {
    terms.push('หนังผี', 'หนังสยอง', 'น่ากลัว', 'หลอน', 'ปีศาจ', 'ซอมบี้');
  }
  if (/(love|romance|romantic|relationship|wedding|couple)/.test(source)) {
    terms.push('หนังรัก', 'โรแมนติก', 'ความรัก', 'คู่รัก');
  }
  if (/(detective|crime|murder|mystery|investigation|police|case)/.test(source)) {
    terms.push('หนังสืบสวน', 'ฆาตกรรม', 'อาชญากรรม', 'นักสืบ', 'คดี', 'ปริศนา');
  }
  if (/(space|alien|future|robot|technology|sci-fi|science fiction|apocalypse)/.test(source)) {
    terms.push('หนังอวกาศ', 'เอเลี่ยน', 'โลกอนาคต', 'หุ่นยนต์', 'ไซไฟ');
  }
  if (/(magic|fantasy|dragon|kingdom|wizard|myth|fairy)/.test(source)) {
    terms.push('เวทมนตร์', 'มังกร', 'แฟนตาซี', 'โลกเวทมนตร์');
  }
  if (/(funny|comedy|comedian|laugh|family)/.test(source)) {
    terms.push('หนังตลก', 'ฮา', 'คอมเมดี้', 'ดูสบาย');
  }

  return terms;
}

function rowIds(rows: Pick<CatalogRow, 'tmdb_id'>[]) {
  return [...new Set(rows.map((row) => Number(row.tmdb_id)).filter((id) => Number.isInteger(id) && id > 0))];
}

async function fetchWatchLinks(rows?: Pick<CatalogRow, 'tmdb_id'>[]) {
  const map = new Map<string, WatchLinkRecord>();
  try {
    const ids = rows ? rowIds(rows) : [];
    const idFilter = ids.length ? `&tmdb_id=in.(${ids.join(',')})` : '';
    const linkRows = await supabaseRest<WatchLinkRecord[]>(
      `admin_movie_links?is_active=eq.true&watch_url=not.is.null${idFilter}&select=tmdb_id,media_type,title,title_th,watch_url,trailer_url`,
      { mode: 'service', next: { revalidate: PUBLIC_CATALOG_REVALIDATE } }
    );
    for (const row of linkRows || []) {
      const watchUrl = normalizeDrivePreviewUrl(row.watch_url);
      if (!row.tmdb_id || !row.media_type || !watchUrl) continue;
      map.set(watchKey(row.media_type, row.tmdb_id), { ...row, watch_url: watchUrl });
    }
  } catch {}
  return map;
}

async function hydrateRows(rows: CatalogRow[], startIndex = 0) {
  if (!rows.length) return [];
  const links = await fetchWatchLinks(rows);
  const episodeSummaries = await getSeriesEpisodeSummaries(rows.filter((row) => row.media_type === 'tv').map((row) => row.tmdb_id));
  return rows.map((row, rowIndex) => applyWatch(rowToMovie(row, startIndex + rowIndex), links, startIndex + rowIndex, episodeSummaries));
}

function rowSearchText(row: CatalogRow) {
  return [
    row.title,
    row.title_en,
    row.overview,
    row.release_year,
    row.release_date,
    row.language,
    row.media_type,
    row.source_bucket,
    ...(row.genres || []),
  ].filter(Boolean).join(' ');
}

function rowToMovie(row: CatalogRow, index: number): MovieItem {
  const rating = Number(row.rating || 0);
  const mainTitle = row.title_en || row.title || `รายการ ${row.tmdb_id}`;
  const searchText = rowSearchText(row);
  const base = {
    id: row.tmdb_id,
    mediaType: row.media_type,
    title: mainTitle,
    titleEn: row.title_en || row.title || undefined,
    overview: row.overview || 'ค้นพบเรื่องราวใหม่ พร้อมข้อมูลภาพยนตร์ ตัวอย่าง นักแสดง และสถานะการรับชมที่ชัดเจน',
    posterUrl: row.poster_url || fallbackImage,
    backdropUrl: row.backdrop_url || row.poster_url || fallbackImage,
    rating,
    year: row.release_year || (row.release_date ? row.release_date.slice(0, 4) : 'ไม่ระบุ'),
    releaseDate: row.release_date || undefined,
    searchText,
    genres: row.genres || [],
    runtime: row.runtime || undefined,
    language: row.language || undefined,
    status: rating >= 8 ? 'review' : 'draft',
    isWatchReady: false,
    label: rating >= 8 ? '8+' : '6.5+',
  } satisfies MovieItem & { releaseDate?: string; searchText?: string };
  return { ...base, badges: [...badges(base, index), searchText, ...hiddenSearchAliases(searchText)] };
}

function applyWatch(item: MovieItem, links: Map<string, WatchLinkRecord>, index: number, episodeSummaries?: EpisodeSummaryLookup): MovieItem {
  const link = links.get(watchKey(item.mediaType, item.id));
  const episodeSummary = item.mediaType === 'tv' ? episodeSummaries?.get(item.id) : undefined;
  if (!link && !episodeSummary?.firstWatchUrl) return { ...item, isWatchReady: false, watchUrl: undefined, episodeCount: episodeSummary?.episodeCount, badges: item.badges || badges({ ...item, isWatchReady: false }, index) };

  const searchText = `${(item as MovieItem & { searchText?: string }).searchText || ''} ${link?.title || ''} ${link?.title_th || ''}`;
  const next: MovieItem = {
    ...item,
    title: link?.title || item.titleEn || item.title,
    titleEn: link?.title || item.titleEn,
    watchUrl: normalizeDrivePreviewUrl(link?.watch_url) ? publicWatchUrl(item) : episodeSummary?.firstWatchUrl ? episodeWatchHref(item.mediaType, item.id) : undefined,
    trailerUrl: normalizeDrivePreviewUrl(link?.trailer_url) || item.trailerUrl,
    episodeCount: episodeSummary?.episodeCount,
    isWatchReady: true,
    status: 'published',
    label: 'พร้อมดู',
  };
  return { ...next, searchText, badges: [...badges(next, index), searchText, ...hiddenSearchAliases(searchText)] } as MovieItem & { searchText?: string };
}

function unique(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(watchKey(item.mediaType, item.id), item);
  return [...map.values()];
}

function recentWindow() {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - 2);
  const end = new Date(now);
  end.setMonth(end.getMonth() + 8);
  return { today: isoDate(now), from: isoDate(start), to: isoDate(end) };
}

function sortRecentHeroItems(items: MovieItem[]) {
  const { today } = recentWindow();
  return [...items].sort((a, b) => {
    const ad = (a as MovieItem & { releaseDate?: string }).releaseDate || '';
    const bd = (b as MovieItem & { releaseDate?: string }).releaseDate || '';
    const au = ad > today;
    const bu = bd > today;
    if (au && bu) return ad.localeCompare(bd);
    if (au !== bu) return au ? -1 : 1;
    return bd.localeCompare(ad);
  });
}

async function rowsForBucket(slug: string, limit: number, offset = 0) {
  return supabaseRest<CatalogRow[]>(
    `tmdb_catalog?select=tmdb_id,media_type,title,title_en,overview,poster_url,backdrop_url,rating,vote_count,popularity,release_year,release_date,genres,language,runtime,source_bucket,sort_score&is_active=eq.true&source_bucket=eq.${encodeURIComponent(slug)}&order=sort_score.desc&limit=${limit}&offset=${offset}`,
    { mode: 'service', next: { revalidate: PUBLIC_CATALOG_REVALIDATE } }
  ).catch(() => []);
}

async function rowsForRecentHero(limit = HOME_HERO_LIMIT) {
  const window = recentWindow();
  return supabaseRest<CatalogRow[]>(
    `tmdb_catalog?select=tmdb_id,media_type,title,title_en,overview,poster_url,backdrop_url,rating,vote_count,popularity,release_year,release_date,genres,language,runtime,source_bucket,sort_score&is_active=eq.true&release_date=gte.${window.from}&release_date=lte.${window.to}&order=release_date.asc&limit=${limit}`,
    { mode: 'service', next: { revalidate: PUBLIC_CATALOG_REVALIDATE } }
  ).catch(() => []);
}

async function rowsForIds(ids: number[]) {
  if (!ids.length) return [];
  return supabaseRest<CatalogRow[]>(
    `tmdb_catalog?select=tmdb_id,media_type,title,title_en,overview,poster_url,backdrop_url,rating,vote_count,popularity,release_year,release_date,genres,language,runtime,source_bucket,sort_score&is_active=eq.true&tmdb_id=in.(${ids.join(',')})&limit=${ids.length}`,
    { mode: 'service', next: { revalidate: PUBLIC_CATALOG_REVALIDATE } },
  ).catch(() => []);
}

async function rowsForWatchReady(limit: number, offset = 0) {
  const links = await supabaseRest<WatchLinkRecord[]>(
    `admin_movie_links?is_active=eq.true&watch_url=not.is.null&select=tmdb_id,media_type,title,title_th,watch_url,trailer_url&order=updated_at.desc.nullslast&limit=${limit}&offset=${offset}`,
    { mode: 'service', next: { revalidate: PUBLIC_CATALOG_REVALIDATE } },
  ).catch(() => []);
  const ids = rowIds(links);
  const rows = await rowsForIds(ids);
  const rowMap = new Map(rows.map((row) => [watchKey(row.media_type, row.tmdb_id), row]));
  return links
    .map((link) => rowMap.get(watchKey(link.media_type, link.tmdb_id)))
    .filter((row): row is CatalogRow => Boolean(row));
}

export async function getCatalogSectionItems(slug: string, limit = HOME_SECTION_LOAD_LIMIT, offset = 0) {
  const safeLimit = Math.min(Math.max(Number(limit) || HOME_SECTION_LOAD_LIMIT, 1), 24);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  if (slug === 'coming-soon') return getFreshComingSoonItems(safeLimit, safeOffset);
  const rows = slug === 'watch-ready'
    ? await rowsForWatchReady(safeLimit, safeOffset)
    : await rowsForBucket(sectionDefs.find((section) => section.slug === slug)?.slug || 'top-rated', safeLimit, safeOffset);
  return hydrateRows(rows, safeOffset);
}

function searchTerms(query: string) {
  return query.trim().replace(/[*,()]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 3);
}

function categoryMatches(item: MovieItem, category?: string | null) {
  const keyword = category?.trim().toLowerCase();
  if (!keyword || keyword === 'ทั้งหมด') return true;
  const text = [
    item.title,
    item.titleEn,
    item.year,
    item.language,
    item.mediaType,
    item.status,
    item.label,
    ...(item.genres || []),
    ...(item.badges || []),
  ].filter(Boolean).join(' ').toLowerCase();
  return text.includes(keyword) || (keyword.includes('ซีรี') && item.mediaType === 'tv') || (keyword.includes('ภาพยนตร์') && item.mediaType === 'movie') || (keyword.includes('พร้อม') && Boolean(item.isWatchReady));
}

export async function searchCatalogItems(query: string, category?: string | null, limit = 48) {
  const safeLimit = Math.min(Math.max(Number(limit) || 48, 1), 96);
  const terms = searchTerms(query);
  const termFilter = terms.length
    ? `&or=(${terms.map((term) => {
      const value = encodeURIComponent(`*${term}*`);
      return `title.ilike.${value},title_en.ilike.${value},overview.ilike.${value}`;
    }).join(',')})`
    : '';
  const rows = await supabaseRest<CatalogRow[]>(
    `tmdb_catalog?select=tmdb_id,media_type,title,title_en,overview,poster_url,backdrop_url,rating,vote_count,popularity,release_year,release_date,genres,language,runtime,source_bucket,sort_score&is_active=eq.true${termFilter}&order=sort_score.desc.nullslast,rating.desc&limit=${safeLimit * 3}`,
    { mode: 'service', next: { revalidate: 120 } },
  ).catch(() => []);
  const items = await hydrateRows(rows, 0);
  return items
    .filter((item) => categoryMatches(item, category))
    .sort((a, b) => Number(b.isWatchReady) - Number(a.isWatchReady) || b.rating - a.rating || Number(b.year || 0) - Number(a.year || 0))
    .slice(0, safeLimit);
}

export async function getCatalogHomePayload(): Promise<HomePayload> {
  const [recentRows, readyRows, rowsByBucket] = await Promise.all([
    rowsForRecentHero(),
    rowsForWatchReady(HOME_SECTION_LIMIT),
    Promise.all(sectionDefs.map((section) => rowsForBucket(section.slug, section.limit))),
  ]);

  const sections: MovieSection[] = sectionDefs
    .map((section, sectionIndex) => ({
      slug: section.slug,
      eyebrow: section.eyebrow,
      title: section.title,
      description: section.description,
      items: rowsByBucket[sectionIndex].map((row, rowIndex) => rowToMovie(row, section.offset + rowIndex)),
    }))
    .filter((section) => section.items.length);

  if (!sections.length) return getTmdbHomePayload();

  const [hydratedSections, readyItems, recentHeroItemsRaw] = await Promise.all([
    Promise.all(sections.map(async (section) => ({ ...section, items: await hydrateRows(rowsByBucket[sectionDefs.findIndex((def) => def.slug === section.slug)] || [], sectionDefs.find((def) => def.slug === section.slug)?.offset || 0) }))),
    hydrateRows(readyRows, 0),
    hydrateRows(recentRows, 0),
  ]);
  const allItems = unique(hydratedSections.flatMap((section) => section.items));
  const recentHeroItems = sortRecentHeroItems(unique(recentHeroItemsRaw).filter((item) => item.backdropUrl && item.rating >= minRating));
  const fallbackHeroItems = allItems.filter((item) => item.backdropUrl && item.rating >= minRating).slice(0, 18);
  const heroItems = recentHeroItems.length ? recentHeroItems.slice(0, HOME_HERO_LIMIT) : fallbackHeroItems.slice(0, HOME_HERO_LIMIT);
  const watchReadySection: MovieSection = {
    slug: 'watch-ready',
    eyebrow: 'พร้อมรับชม',
    title: 'แนะนำสำหรับคุณ',
    description: 'คัดจากรายการที่พร้อมรับชม',
    items: readyItems.length ? readyItems : sections[0].items,
  };

  return {
    source: 'tmdb',
    hero: heroItems[0] || allItems[0],
    heroItems: heroItems.length ? heroItems : allItems.slice(0, 5),
    sections: [watchReadySection, ...hydratedSections],
  };
}
