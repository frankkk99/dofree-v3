import { supabaseRest } from './supabase-rest';
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

const minRating = 6.5;
const fallbackImage = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80';

const sectionDefs: SectionDef[] = [
  { slug: 'top-rated', eyebrow: 'คะแนนสูง', title: 'คะแนน 6.5+ น่าดู', description: 'คัดจาก Supabase catalog เรียงคะแนนและความนิยม', limit: 160, offset: 0 },
  { slug: 'popular', eyebrow: 'กำลังนิยม', title: 'ยอดนิยมคะแนนดี', description: 'หนังยอดนิยมที่คะแนนผ่านเกณฑ์', limit: 160, offset: 200 },
  { slug: 'now-playing', eyebrow: 'มาใหม่', title: 'ภาพยนตร์มาใหม่คะแนนดี', description: 'หนังใหม่ที่พร้อมขึ้นหน้าแรก', limit: 100, offset: 400 },
  { slug: 'series', eyebrow: 'ซีรีส์', title: 'ซีรีส์น่าติดตาม', description: 'ซีรีส์คะแนนดีจาก catalog', limit: 120, offset: 540 },
  { slug: 'thai', eyebrow: 'Local Focus', title: 'หนังไทยคะแนนดี', description: 'หนังไทยสำหรับตลาดไทยและ SEO', limit: 120, offset: 700 },
  { slug: 'action', eyebrow: 'Action', title: 'แอ็กชัน', description: 'หนังแอ็กชันจังหวะเร็ว', limit: 100, offset: 860 },
  { slug: 'adventure', eyebrow: 'Adventure', title: 'ผจญภัย', description: 'หนังเดินทางและโลกกว้าง', limit: 100, offset: 980 },
  { slug: 'animation', eyebrow: 'Animation', title: 'แอนิเมชัน', description: 'แอนิเมชันคะแนนดีสำหรับทุกวัย', limit: 100, offset: 1100 },
  { slug: 'drama', eyebrow: 'Drama', title: 'ดราม่า', description: 'ดราม่าที่มีอารมณ์และตัวละครชัด', limit: 100, offset: 1220 },
  { slug: 'thriller', eyebrow: 'Thriller', title: 'ระทึกขวัญ', description: 'หนังลุ้นและเข้มข้น', limit: 100, offset: 1340 },
  { slug: 'horror', eyebrow: 'Horror', title: 'สยองขวัญ', description: 'หนังสยองสำหรับโทนมืดของเว็บ', limit: 100, offset: 1460 },
  { slug: 'comedy', eyebrow: 'Comedy', title: 'คอมเมดี้', description: 'หนังดูง่ายและเบรกอารมณ์', limit: 100, offset: 1580 },
  { slug: 'sci-fi', eyebrow: 'Sci-Fi', title: 'ไซไฟ', description: 'หนังโลกอนาคตและจินตนาการ', limit: 100, offset: 1700 },
  { slug: 'romance', eyebrow: 'Romance', title: 'โรแมนติก', description: 'หนังรักและความสัมพันธ์', limit: 100, offset: 1820 },
  { slug: 'fantasy', eyebrow: 'Fantasy', title: 'แฟนตาซี', description: 'โลกเหนือจริงและการผจญภัย', limit: 100, offset: 1940 },
  { slug: 'crime', eyebrow: 'Crime', title: 'อาชญากรรม', description: 'หนังอาชญากรรมและการสืบสวน', limit: 100, offset: 2060 },
  { slug: 'mystery', eyebrow: 'Mystery', title: 'ลึกลับ', description: 'หนังปริศนาและความลับ', limit: 100, offset: 2180 },
  { slug: 'korea', eyebrow: 'Korea', title: 'หนังเกาหลี', description: 'คัดหนังเกาหลีคะแนนดี', limit: 100, offset: 2300 },
  { slug: 'japan', eyebrow: 'Japan', title: 'หนังญี่ปุ่น', description: 'คัดหนังญี่ปุ่นคะแนนดี', limit: 100, offset: 2420 },
  { slug: 'china', eyebrow: 'China', title: 'หนังจีน', description: 'คัดหนังจีนคะแนนดี', limit: 100, offset: 2540 },
  { slug: 'documentary', eyebrow: 'Documentary', title: 'สารคดี', description: 'สารคดีและเรื่องจริง', limit: 80, offset: 2660 },
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

async function fetchWatchLinks() {
  const map = new Map<string, WatchLinkRecord>();
  try {
    const rows = await supabaseRest<WatchLinkRecord[]>(
      'admin_movie_links?is_active=eq.true&watch_url=not.is.null&select=tmdb_id,media_type,title,title_th,watch_url,trailer_url',
      { mode: 'service', cache: 'no-store' }
    );
    for (const row of rows || []) {
      const watchUrl = normalizeDrivePreviewUrl(row.watch_url);
      if (!row.tmdb_id || !row.media_type || !watchUrl) continue;
      map.set(watchKey(row.media_type, row.tmdb_id), { ...row, watch_url: watchUrl });
    }
  } catch {}
  return map;
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
  const mainTitle = row.title_en || row.title || `TMDB ${row.tmdb_id}`;
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

function applyWatch(item: MovieItem, links: Map<string, WatchLinkRecord>, index: number): MovieItem {
  const link = links.get(watchKey(item.mediaType, item.id));
  if (!link) return { ...item, isWatchReady: false, watchUrl: undefined, badges: item.badges || badges({ ...item, isWatchReady: false }, index) };

  const searchText = `${(item as MovieItem & { searchText?: string }).searchText || ''} ${link.title || ''} ${link.title_th || ''}`;
  const next: MovieItem = {
    ...item,
    title: link.title || item.titleEn || item.title,
    titleEn: link.title || item.titleEn,
    watchUrl: normalizeDrivePreviewUrl(link.watch_url),
    trailerUrl: normalizeDrivePreviewUrl(link.trailer_url) || item.trailerUrl,
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

async function rowsForBucket(slug: string, limit: number) {
  return supabaseRest<CatalogRow[]>(
    `tmdb_catalog?select=tmdb_id,media_type,title,title_en,overview,poster_url,backdrop_url,rating,vote_count,popularity,release_year,release_date,genres,language,runtime,source_bucket,sort_score&is_active=eq.true&source_bucket=eq.${encodeURIComponent(slug)}&order=sort_score.desc&limit=${limit}`,
    { mode: 'service', cache: 'no-store' }
  ).catch(() => []);
}

async function rowsForRecentHero(limit = 36) {
  const window = recentWindow();
  return supabaseRest<CatalogRow[]>(
    `tmdb_catalog?select=tmdb_id,media_type,title,title_en,overview,poster_url,backdrop_url,rating,vote_count,popularity,release_year,release_date,genres,language,runtime,source_bucket,sort_score&is_active=eq.true&release_date=gte.${window.from}&release_date=lte.${window.to}&order=release_date.asc&limit=${limit}`,
    { mode: 'service', cache: 'no-store' }
  ).catch(() => []);
}

export async function getCatalogHomePayload(): Promise<HomePayload> {
  const links = await fetchWatchLinks();
  const [recentRows, rowsByBucket] = await Promise.all([
    rowsForRecentHero(),
    Promise.all(sectionDefs.map((section) => rowsForBucket(section.slug, section.limit))),
  ]);

  const sections: MovieSection[] = sectionDefs
    .map((section, sectionIndex) => ({
      slug: section.slug,
      eyebrow: section.eyebrow,
      title: section.title,
      description: section.description,
      items: rowsByBucket[sectionIndex].map((row, rowIndex) => applyWatch(rowToMovie(row, section.offset + rowIndex), links, section.offset + rowIndex)),
    }))
    .filter((section) => section.items.length);

  if (!sections.length) return getTmdbHomePayload();

  const allItems = unique(sections.flatMap((section) => section.items));
  const recentHeroItems = sortRecentHeroItems(unique(recentRows.map((row, index) => applyWatch(rowToMovie(row, index), links, index))).filter((item) => item.backdropUrl && item.rating >= minRating));
  const fallbackHeroItems = allItems.filter((item) => item.backdropUrl && item.rating >= minRating).slice(0, 18);
  const heroItems = recentHeroItems.length ? recentHeroItems.slice(0, 18) : fallbackHeroItems;
  const readyItems = allItems.filter((item) => item.isWatchReady && item.watchUrl && item.rating >= minRating);
  const watchReadySection: MovieSection = {
    slug: 'watch-ready',
    eyebrow: 'พร้อมรับชม',
    title: 'แนะนำสำหรับคุณ',
    description: 'คัดจาก Supabase catalog และลิงก์รับชมที่แอดมินใส่ไว้',
    items: readyItems.length ? readyItems : sections[0].items,
  };

  return {
    source: 'tmdb',
    hero: heroItems[0] || allItems[0],
    heroItems: heroItems.length ? heroItems : allItems.slice(0, 5),
    sections: [watchReadySection, ...sections],
  };
}
