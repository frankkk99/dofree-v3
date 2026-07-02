import { supabaseRest } from './supabase-rest';
import { episodeWatchHref, getSeriesEpisodeSummaries } from './series-episodes';
import { mediaDetailPath } from './seo';
import { getFreshComingSoonItems, TMDB_RELEASE_SECTION_LIMIT } from './tmdb-release-window';
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

export type CatalogSectionDef = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  limit: number;
  offset: number;
  mediaType?: MediaType;
  sourceBuckets?: string[];
  languages?: string[];
  genreKeywords?: string[];
  minRating?: number;
  sort?: 'score' | 'popular' | 'rating' | 'recent';
  showOnHome?: boolean;
};

type EpisodeSummaryLookup = Awaited<ReturnType<typeof getSeriesEpisodeSummaries>>;

export const HOME_SECTION_LIMIT = 12;
export const HOME_SECTION_LOAD_LIMIT = 12;
const HOME_HERO_LIMIT = 6;
const PUBLIC_CATALOG_REVALIDATE = 300;
const minRating = 6.5;
const fallbackImage = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80';
const catalogSelect = 'tmdb_id,media_type,title,title_en,overview,poster_url,backdrop_url,rating,vote_count,popularity,release_year,release_date,genres,language,runtime,source_bucket,sort_score';

export const catalogSectionDefs: CatalogSectionDef[] = [
  { slug: 'top-rated', eyebrow: 'Top Rated', title: 'คะแนนสูงน่าดู', description: 'คัดจาก catalog เรียงคะแนนสูง คะแนนโหวต และความนิยม', limit: HOME_SECTION_LIMIT, offset: 0, minRating: 7, sort: 'rating' },
  { slug: 'popular', eyebrow: 'Popular', title: 'ยอดนิยมจาก TMDB', description: 'รวมหนังและซีรีส์ยอดนิยมที่ Sync เข้ามาแล้วจาก TMDB', limit: HOME_SECTION_LIMIT, offset: 160, sourceBuckets: ['popular'], minRating: 5, sort: 'popular' },
  { slug: 'now-playing', eyebrow: 'Now Playing', title: 'หนังใหม่ / กำลังฉาย', description: 'คัดจากชุด Now Playing และรายการ release date ล่าสุด', limit: HOME_SECTION_LIMIT, offset: 320, mediaType: 'movie', sourceBuckets: ['new-release'], minRating: 5, sort: 'recent' },
  { slug: 'upcoming', eyebrow: 'Upcoming', title: 'ใกล้เข้าฉาย', description: 'หนังใกล้เข้าฉายและรายการที่เหมาะสำหรับหมวดเร็ว ๆ นี้', limit: HOME_SECTION_LIMIT, offset: 480, mediaType: 'movie', sourceBuckets: ['coming-soon'], minRating: 0, sort: 'recent' },
  { slug: 'popular-series', eyebrow: 'Series', title: 'ซีรีส์ยอดนิยม', description: 'ซีรีส์ยอดนิยมและซีรีส์ที่เหมาะกับการดูต่อเนื่อง', limit: HOME_SECTION_LIMIT, offset: 640, mediaType: 'tv', sourceBuckets: ['series'], minRating: 5, sort: 'popular' },

  { slug: 'netflix-style', eyebrow: 'Netflix', title: 'โทน Netflix', description: 'คอนเทนต์ที่ถูก Sync จาก provider กลุ่ม Netflix', limit: HOME_SECTION_LIMIT, offset: 800, sourceBuckets: ['netflix'], minRating: 5, sort: 'popular' },
  { slug: 'disney-style', eyebrow: 'Disney+', title: 'Disney / Family Hits', description: 'คอนเทนต์ Disney และคอนเทนต์สำหรับครอบครัว', limit: HOME_SECTION_LIMIT, offset: 960, sourceBuckets: ['disney'], genreKeywords: ['ครอบครัว', 'แอนิเมชัน'], minRating: 5, sort: 'popular' },
  { slug: 'hbo-max', eyebrow: 'HBO / Max', title: 'HBO / Max', description: 'คอนเทนต์สไตล์ HBO และ Max จากชุด provider sync', limit: HOME_SECTION_LIMIT, offset: 1120, sourceBuckets: ['hbo'], minRating: 5, sort: 'popular' },
  { slug: 'prime-video', eyebrow: 'Prime Video', title: 'Prime Video', description: 'คอนเทนต์จากชุด Prime Video ที่ Sync เข้าระบบ', limit: HOME_SECTION_LIMIT, offset: 1280, sourceBuckets: ['prime'], minRating: 5, sort: 'popular' },
  { slug: 'apple-tv-style', eyebrow: 'Apple TV', title: 'Apple TV Style', description: 'คอนเทนต์จาก provider Apple TV และรายการคะแนนดี', limit: HOME_SECTION_LIMIT, offset: 1440, sourceBuckets: ['apple'], minRating: 5, sort: 'popular' },

  { slug: 'thai-content', eyebrow: 'Thai', title: 'หนังและซีรีส์ไทย', description: 'คอนเทนต์ภาษาไทยและรายการที่เหมาะกับผู้ชมในประเทศไทย', limit: HOME_SECTION_LIMIT, offset: 1600, sourceBuckets: ['thai'], languages: ['th'], minRating: 4.5, sort: 'popular' },
  { slug: 'korean-drama', eyebrow: 'Korea', title: 'เกาหลี / K-Drama', description: 'หนังและซีรีส์เกาหลีจากชุดภาษา ko และหมวด drama', limit: HOME_SECTION_LIMIT, offset: 1760, sourceBuckets: ['korea'], languages: ['ko'], genreKeywords: ['ดราม่า'], minRating: 5, sort: 'popular' },
  { slug: 'anime', eyebrow: 'Anime', title: 'อนิเมะญี่ปุ่น', description: 'อนิเมะและแอนิเมชันญี่ปุ่นจากชุด Anime Sync', limit: HOME_SECTION_LIMIT, offset: 1920, sourceBuckets: ['anime'], languages: ['ja'], genreKeywords: ['แอนิเมชัน'], minRating: 5, sort: 'popular' },
  { slug: 'japanese', eyebrow: 'Japan', title: 'คอนเทนต์ญี่ปุ่น', description: 'หนัง ซีรีส์ และแอนิเมชันญี่ปุ่น', limit: HOME_SECTION_LIMIT, offset: 2080, sourceBuckets: ['japan'], languages: ['ja'], minRating: 5, sort: 'popular' },
  { slug: 'chinese', eyebrow: 'China', title: 'คอนเทนต์จีน', description: 'หนังและซีรีส์จีนที่คัดจากภาษา zh และชุด China', limit: HOME_SECTION_LIMIT, offset: 2240, sourceBuckets: ['china'], languages: ['zh'], minRating: 5, sort: 'popular' },
  { slug: 'indian', eyebrow: 'India', title: 'คอนเทนต์อินเดีย', description: 'หนังและซีรีส์อินเดียจากภาษา hi และชุด Indian Sync', limit: HOME_SECTION_LIMIT, offset: 2400, sourceBuckets: ['indian'], languages: ['hi'], minRating: 5, sort: 'popular' },
  { slug: 'spanish', eyebrow: 'Spanish', title: 'คอนเทนต์สเปน', description: 'หนังและซีรีส์ภาษาสเปนจากชุด Spanish Sync', limit: HOME_SECTION_LIMIT, offset: 2560, sourceBuckets: ['spanish'], languages: ['es'], minRating: 5, sort: 'popular' },

  { slug: 'marvel', eyebrow: 'Marvel', title: 'Marvel', description: 'คอนเทนต์ Marvel จาก company sync และรายการที่เกี่ยวข้อง', limit: HOME_SECTION_LIMIT, offset: 2720, sourceBuckets: ['marvel'], minRating: 5, sort: 'popular' },
  { slug: 'dc', eyebrow: 'DC', title: 'DC', description: 'คอนเทนต์ DC จาก company sync และรายการที่เกี่ยวข้อง', limit: HOME_SECTION_LIMIT, offset: 2880, sourceBuckets: ['dc'], minRating: 5, sort: 'popular' },

  { slug: 'action', eyebrow: 'Action', title: 'แอ็กชัน', description: 'หนังแอ็กชัน ภารกิจ การต่อสู้ และจังหวะเร็ว', limit: HOME_SECTION_LIMIT, offset: 3040, mediaType: 'movie', sourceBuckets: ['action'], genreKeywords: ['แอ็กชัน'], minRating: 5, sort: 'popular' },
  { slug: 'crime-thriller', eyebrow: 'Crime / Thriller', title: 'อาชญากรรม / ระทึกขวัญ', description: 'อาชญากรรม สืบสวน ฆาตกรรม และเรื่องระทึกขวัญ', limit: HOME_SECTION_LIMIT, offset: 3200, sourceBuckets: ['crime'], genreKeywords: ['อาชญากรรม', 'ระทึกขวัญ', 'ลึกลับ'], minRating: 5, sort: 'popular' },
  { slug: 'horror', eyebrow: 'Horror', title: 'สยองขวัญ', description: 'หนังผี สยองขวัญ ซอมบี้ และคอนเทนต์โทนมืด', limit: HOME_SECTION_LIMIT, offset: 3360, mediaType: 'movie', sourceBuckets: ['horror'], genreKeywords: ['สยองขวัญ'], minRating: 5, sort: 'popular' },
  { slug: 'comedy', eyebrow: 'Comedy', title: 'คอมเมดี้', description: 'หนังตลก คอมเมดี้ และรายการดูง่าย', limit: HOME_SECTION_LIMIT, offset: 3520, sourceBuckets: ['comedy'], genreKeywords: ['คอมเมดี้'], minRating: 5, sort: 'popular' },
  { slug: 'romance', eyebrow: 'Romance', title: 'โรแมนติก', description: 'หนังรัก ความสัมพันธ์ และเรื่องอบอุ่นหัวใจ', limit: HOME_SECTION_LIMIT, offset: 3680, sourceBuckets: ['romance'], genreKeywords: ['โรแมนติก'], minRating: 5, sort: 'popular' },
  { slug: 'sci-fi-fantasy', eyebrow: 'Sci-Fi / Fantasy', title: 'ไซไฟ / แฟนตาซี', description: 'อวกาศ โลกอนาคต เวทมนตร์ และแฟนตาซี', limit: HOME_SECTION_LIMIT, offset: 3840, mediaType: 'movie', sourceBuckets: ['sci-fi'], genreKeywords: ['ไซไฟ', 'แฟนตาซี'], minRating: 5, sort: 'popular' },
  { slug: 'animation', eyebrow: 'Animation', title: 'แอนิเมชัน', description: 'แอนิเมชันคะแนนดีสำหรับหลายวัย', limit: HOME_SECTION_LIMIT, offset: 4000, sourceBuckets: ['animation'], genreKeywords: ['แอนิเมชัน'], minRating: 5, sort: 'popular' },
  { slug: 'family-kids', eyebrow: 'Family / Kids', title: 'ครอบครัว / เด็ก', description: 'รายการสำหรับครอบครัว เด็ก และดูร่วมกันได้ง่าย', limit: HOME_SECTION_LIMIT, offset: 4160, sourceBuckets: ['family'], genreKeywords: ['ครอบครัว', 'แอนิเมชัน'], minRating: 5, sort: 'popular' },
  { slug: 'documentary', eyebrow: 'Documentary', title: 'สารคดี', description: 'สารคดี เรื่องจริง และคอนเทนต์เชิงข้อมูล', limit: HOME_SECTION_LIMIT, offset: 4320, sourceBuckets: ['documentary'], genreKeywords: ['สารคดี'], minRating: 5, sort: 'popular' },

  { slug: 'series', eyebrow: 'ซีรีส์', title: 'ซีรีส์น่าติดตาม', description: 'ทางลัดเดิมสำหรับซีรีส์ทั้งหมด', limit: HOME_SECTION_LIMIT, offset: 640, mediaType: 'tv', sourceBuckets: ['series'], minRating: 5, sort: 'popular', showOnHome: false },
  { slug: 'thai', eyebrow: 'Thai', title: 'หนังไทยคะแนนดี', description: 'ทางลัดเดิมสำหรับคอนเทนต์ไทย', limit: HOME_SECTION_LIMIT, offset: 1600, sourceBuckets: ['thai'], languages: ['th'], minRating: 4.5, sort: 'popular', showOnHome: false },
  { slug: 'korea', eyebrow: 'Korea', title: 'หนังเกาหลี', description: 'ทางลัดเดิมสำหรับคอนเทนต์เกาหลี', limit: HOME_SECTION_LIMIT, offset: 1760, sourceBuckets: ['korea'], languages: ['ko'], minRating: 5, sort: 'popular', showOnHome: false },
  { slug: 'japan', eyebrow: 'Japan', title: 'หนังญี่ปุ่น', description: 'ทางลัดเดิมสำหรับคอนเทนต์ญี่ปุ่น', limit: HOME_SECTION_LIMIT, offset: 2080, sourceBuckets: ['japan'], languages: ['ja'], minRating: 5, sort: 'popular', showOnHome: false },
  { slug: 'china', eyebrow: 'China', title: 'หนังจีน', description: 'ทางลัดเดิมสำหรับคอนเทนต์จีน', limit: HOME_SECTION_LIMIT, offset: 2240, sourceBuckets: ['china'], languages: ['zh'], minRating: 5, sort: 'popular', showOnHome: false },
  { slug: 'sci-fi', eyebrow: 'Sci-Fi', title: 'ไซไฟ', description: 'ทางลัดเดิมสำหรับไซไฟ', limit: HOME_SECTION_LIMIT, offset: 3840, mediaType: 'movie', sourceBuckets: ['sci-fi'], genreKeywords: ['ไซไฟ'], minRating: 5, sort: 'popular', showOnHome: false },
  { slug: 'crime', eyebrow: 'Crime', title: 'อาชญากรรม', description: 'ทางลัดเดิมสำหรับอาชญากรรม', limit: HOME_SECTION_LIMIT, offset: 3200, sourceBuckets: ['crime'], genreKeywords: ['อาชญากรรม'], minRating: 5, sort: 'popular', showOnHome: false },
  { slug: 'thriller', eyebrow: 'Thriller', title: 'ระทึกขวัญ', description: 'ทางลัดเดิมสำหรับระทึกขวัญ', limit: HOME_SECTION_LIMIT, offset: 3200, sourceBuckets: ['crime'], genreKeywords: ['ระทึกขวัญ'], minRating: 5, sort: 'popular', showOnHome: false },
  { slug: 'adventure', eyebrow: 'Adventure', title: 'ผจญภัย', description: 'ทางลัดเดิมสำหรับผจญภัย', limit: HOME_SECTION_LIMIT, offset: 4480, genreKeywords: ['ผจญภัย'], minRating: 5, sort: 'popular', showOnHome: false },
  { slug: 'drama', eyebrow: 'Drama', title: 'ดราม่า', description: 'ทางลัดเดิมสำหรับดราม่า', limit: HOME_SECTION_LIMIT, offset: 4640, genreKeywords: ['ดราม่า'], minRating: 5, sort: 'popular', showOnHome: false },
  { slug: 'fantasy', eyebrow: 'Fantasy', title: 'แฟนตาซี', description: 'ทางลัดเดิมสำหรับแฟนตาซี', limit: HOME_SECTION_LIMIT, offset: 4800, genreKeywords: ['แฟนตาซี'], minRating: 5, sort: 'popular', showOnHome: false },
  { slug: 'mystery', eyebrow: 'Mystery', title: 'ลึกลับ', description: 'ทางลัดเดิมสำหรับลึกลับ', limit: HOME_SECTION_LIMIT, offset: 4960, genreKeywords: ['ลึกลับ'], minRating: 5, sort: 'popular', showOnHome: false },
];

export const homeSectionDefs = catalogSectionDefs.filter((section) => section.showOnHome !== false);

export function getCatalogSectionMeta(slug: string) {
  return catalogSectionDefs.find((section) => section.slug === slug) || null;
}

export function getCatalogStaticCategoryParams() {
  return catalogSectionDefs.map((section) => ({ slug: section.slug }));
}

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

function publicWatchUrl(item: Pick<MovieItem, 'mediaType' | 'id' | 'title'>) {
  return mediaDetailPath(item.mediaType, item.id, item.title, 'watch');
}

function badges(item: Pick<MovieItem, 'rating' | 'language' | 'isWatchReady'>, index: number) {
  const items: string[] = [];
  if (item.isWatchReady) items.push('พร้อมดู', 'HD');
  if (item.rating >= 8) items.push('8+');
  if (item.rating >= minRating) items.push('6.5+');
  if (index < 4) items.push('ใหม่');
  if (item.language === 'th') items.push('พากย์ไทย');
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
  return { ...base, badges: badges(base, index), searchText, hiddenSearchTerms: hiddenSearchAliases(searchText) };
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
    watchUrl: normalizeDrivePreviewUrl(link?.watch_url) ? publicWatchUrl(item) : episodeSummary?.firstWatchUrl ? episodeWatchHref(item.mediaType, item.id, undefined, item.title) : undefined,
    trailerUrl: normalizeDrivePreviewUrl(link?.trailer_url) || item.trailerUrl,
    episodeCount: episodeSummary?.episodeCount,
    isWatchReady: true,
    status: 'published',
    label: 'พร้อมดู',
  };
  return { ...next, searchText, hiddenSearchTerms: hiddenSearchAliases(searchText), badges: badges(next, index) };
}

function unique(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(watchKey(item.mediaType, item.id), item);
  return [...map.values()];
}

function uniqueRows(rows: CatalogRow[]) {
  const map = new Map<string, CatalogRow>();
  for (const row of rows) map.set(watchKey(row.media_type, row.tmdb_id), row);
  return [...map.values()];
}

function shuffleSeed() {
  return Math.floor(Date.now() / (1000 * 60 * 5));
}

function seededScore(item: MovieItem, seed: number, index: number) {
  const source = `${seed}:${item.mediaType}:${item.id}:${index}`;
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shuffleItems(items: MovieItem[], seed = shuffleSeed()) {
  return [...items]
    .map((item, index) => ({ item, score: seededScore(item, seed, index) }))
    .sort((a, b) => a.score - b.score)
    .map(({ item }) => item);
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

function rowMatchesSection(row: CatalogRow, section: CatalogSectionDef) {
  if (section.mediaType && row.media_type !== section.mediaType) return false;

  const rating = Number(row.rating || 0);
  if (rating < (section.minRating ?? minRating)) return false;

  const sourceBucket = String(row.source_bucket || '').toLowerCase();
  const language = String(row.language || '').toLowerCase();
  const genres = (row.genres || []).map((genre) => String(genre).toLowerCase());
  const text = [row.title, row.title_en, row.overview, sourceBucket, language, ...genres].filter(Boolean).join(' ').toLowerCase();

  const sourceMatch = !section.sourceBuckets?.length || section.sourceBuckets.some((bucket) => sourceBucket === bucket.toLowerCase());
  const languageMatch = !section.languages?.length || section.languages.some((value) => language === value.toLowerCase());
  const genreMatch = !section.genreKeywords?.length || section.genreKeywords.some((keyword) => text.includes(keyword.toLowerCase()));

  if (section.sourceBuckets?.length && (section.languages?.length || section.genreKeywords?.length)) {
    return sourceMatch || languageMatch || genreMatch;
  }

  return sourceMatch && languageMatch && genreMatch;
}

function orderByForSection(section: CatalogSectionDef) {
  if (section.sort === 'rating') return 'rating.desc.nullslast,vote_count.desc.nullslast,sort_score.desc.nullslast';
  if (section.sort === 'recent') return 'release_date.desc.nullslast,sort_score.desc.nullslast';
  if (section.sort === 'popular') return 'popularity.desc.nullslast,sort_score.desc.nullslast';
  return 'sort_score.desc.nullslast,rating.desc';
}

function inList(values: string[]) {
  return values.map((value) => encodeURIComponent(value)).join(',');
}

async function rowsForSection(section: CatalogSectionDef, limit: number, offset = 0) {
  const fetchLimit = Math.min(Math.max(offset + limit * 8, limit + 80), 960);
  const filters = [
    'is_active=eq.true',
    'poster_url=not.is.null',
    `rating=gte.${section.minRating ?? 0}`,
  ];

  if (section.mediaType) filters.push(`media_type=eq.${section.mediaType}`);
  if (section.sourceBuckets?.length === 1) filters.push(`source_bucket=eq.${encodeURIComponent(section.sourceBuckets[0])}`);
  if (section.sourceBuckets && section.sourceBuckets.length > 1) filters.push(`source_bucket=in.(${inList(section.sourceBuckets)})`);
  if (section.languages?.length === 1 && !section.sourceBuckets?.length) filters.push(`language=eq.${encodeURIComponent(section.languages[0])}`);
  if (section.languages && section.languages.length > 1 && !section.sourceBuckets?.length) filters.push(`language=in.(${inList(section.languages)})`);

  const directRows = await supabaseRest<CatalogRow[]>(
    `tmdb_catalog?select=${catalogSelect}&${filters.join('&')}&order=${orderByForSection(section)}&limit=${fetchLimit}`,
    { mode: 'service', next: { revalidate: PUBLIC_CATALOG_REVALIDATE } }
  ).catch(() => []);

  let rows = uniqueRows(directRows).filter((row) => rowMatchesSection(row, section));

  if (rows.length < offset + limit && (section.genreKeywords?.length || section.languages?.length)) {
    const broadFilters = [
      'is_active=eq.true',
      'poster_url=not.is.null',
      `rating=gte.${section.minRating ?? 0}`,
      section.mediaType ? `media_type=eq.${section.mediaType}` : '',
    ].filter(Boolean);
    const fallbackRows = await supabaseRest<CatalogRow[]>(
      `tmdb_catalog?select=${catalogSelect}&${broadFilters.join('&')}&order=${orderByForSection(section)}&limit=${fetchLimit}`,
      { mode: 'service', next: { revalidate: PUBLIC_CATALOG_REVALIDATE } }
    ).catch(() => []);
    rows = uniqueRows([...rows, ...fallbackRows.filter((row) => rowMatchesSection(row, section))]);
  }

  return rows.slice(offset, offset + limit);
}

async function rowsForRecentHero(limit = HOME_HERO_LIMIT) {
  const window = recentWindow();
  return supabaseRest<CatalogRow[]>(
    `tmdb_catalog?select=${catalogSelect}&is_active=eq.true&release_date=gte.${window.from}&release_date=lte.${window.to}&order=release_date.asc&limit=${limit}`,
    { mode: 'service', next: { revalidate: PUBLIC_CATALOG_REVALIDATE } }
  ).catch(() => []);
}

async function rowsForIds(ids: number[]) {
  if (!ids.length) return [];
  return supabaseRest<CatalogRow[]>(
    `tmdb_catalog?select=${catalogSelect}&is_active=eq.true&tmdb_id=in.(${ids.join(',')})&limit=${ids.length}`,
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

async function randomCatalogItems(limit: number, offset = 0) {
  const rows = await supabaseRest<CatalogRow[]>(
    `tmdb_catalog?select=${catalogSelect}&is_active=eq.true&poster_url=not.is.null&order=sort_score.desc.nullslast,rating.desc&limit=240`,
    { mode: 'service', next: { revalidate: PUBLIC_CATALOG_REVALIDATE } },
  ).catch(() => []);
  const items = await hydrateRows(rows, 0);
  return shuffleItems(items.filter((item) => item.posterUrl && item.rating >= minRating)).slice(offset, offset + limit);
}

export async function getCatalogSectionItems(slug: string, limit = HOME_SECTION_LOAD_LIMIT, offset = 0) {
  const maxLimit = slug === 'coming-soon' ? TMDB_RELEASE_SECTION_LIMIT : 24;
  const safeLimit = Math.min(Math.max(Number(limit) || HOME_SECTION_LOAD_LIMIT, 1), maxLimit);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  if (slug === 'coming-soon') return getFreshComingSoonItems(safeLimit, safeOffset);
  if (slug === 'random-picks') return randomCatalogItems(safeLimit, safeOffset);
  if (slug === 'watch-ready') return hydrateRows(await rowsForWatchReady(safeLimit, safeOffset), safeOffset);

  const section = getCatalogSectionMeta(slug) || getCatalogSectionMeta('top-rated') || homeSectionDefs[0];
  const rows = await rowsForSection(section, safeLimit, safeOffset);
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
    item.searchText,
    ...(item.genres || []),
    ...(item.badges || []),
    ...(item.hiddenSearchTerms || []),
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
    `tmdb_catalog?select=${catalogSelect}&is_active=eq.true${termFilter}&order=sort_score.desc.nullslast,rating.desc&limit=${safeLimit * 3}`,
    { mode: 'service', next: { revalidate: 120 } },
  ).catch(() => []);
  const items = await hydrateRows(rows, 0);
  return items
    .filter((item) => categoryMatches(item, category))
    .sort((a, b) => Number(b.isWatchReady) - Number(a.isWatchReady) || b.rating - a.rating || Number(b.year || 0) - Number(a.year || 0))
    .slice(0, safeLimit);
}

export async function getCatalogHomePayload(): Promise<HomePayload> {
  const [recentRows, readyRows, rowsBySection] = await Promise.all([
    rowsForRecentHero(),
    rowsForWatchReady(HOME_SECTION_LIMIT),
    Promise.all(homeSectionDefs.map((section) => rowsForSection(section, section.limit, 0))),
  ]);

  const sections: MovieSection[] = homeSectionDefs
    .map((section, sectionIndex) => ({
      slug: section.slug,
      eyebrow: section.eyebrow,
      title: section.title,
      description: section.description,
      items: rowsBySection[sectionIndex].map((row, rowIndex) => rowToMovie(row, section.offset + rowIndex)),
    }))
    .filter((section) => section.items.length);

  if (!sections.length) return getTmdbHomePayload();

  const [hydratedSections, readyItems, recentHeroItemsRaw] = await Promise.all([
    Promise.all(sections.map(async (section) => {
      const sectionDef = homeSectionDefs.find((def) => def.slug === section.slug);
      const rows = rowsBySection[homeSectionDefs.findIndex((def) => def.slug === section.slug)] || [];
      return { ...section, items: await hydrateRows(rows, sectionDef?.offset || 0) };
    })),
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
  const randomSection: MovieSection = {
    slug: 'random-picks',
    eyebrow: 'Random',
    title: 'สุ่มแนะนำรอบนี้',
    description: 'สลับรายการจาก catalog ทุกครั้งที่หน้าแรกรีเฟรช',
    items: shuffleItems(allItems.filter((item) => item.posterUrl && item.rating >= minRating)).slice(0, HOME_SECTION_LIMIT),
  };

  return {
    source: 'tmdb',
    hero: heroItems[0] || allItems[0],
    heroItems: heroItems.length ? heroItems : allItems.slice(0, 5),
    sections: [watchReadySection, randomSection, ...hydratedSections],
  };
}
