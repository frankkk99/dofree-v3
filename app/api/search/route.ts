import { NextResponse } from 'next/server';
import { mediaDetailPath } from '@/lib/seo';
import { supabaseRest } from '@/lib/supabase-rest';
import type { MediaType, MovieItem } from '@/lib/tmdb';

export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=240',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=240',
};

const fallbackImage = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80';
const knownSlugPattern = /^[a-z0-9-]+$/;
const countryLanguage: Record<string, string[]> = {
  th: ['th'],
  kr: ['ko'],
  korea: ['ko'],
  jp: ['ja'],
  japan: ['ja'],
  cn: ['zh', 'cn'],
  china: ['zh', 'cn'],
  us: ['en'],
  uk: ['en'],
  in: ['hi', 'ta', 'te', 'ml'],
};

const bucketKeywords: Record<string, string[]> = {
  horror: ['horror', 'ghost', 'haunted', 'demon', 'evil', 'spirit', 'supernatural', 'zombie', 'สยอง', 'ผี', 'หลอน', 'วิญญาณ', 'ปีศาจ', 'ซอมบี้', 'น่ากลัว'],
  comedy: ['comedy', 'funny', 'laugh', 'sitcom', 'ตลก', 'คอมเมดี้', 'ฮา', 'ขำ', 'เบาสมอง', 'ไม่เครียด'],
  action: ['action', 'fight', 'fighting', 'martial', 'mission', 'spy', 'agent', 'gun', 'weapon', 'แอ็กชัน', 'แอคชั่น', 'บู๊', 'ต่อสู้', 'ยิงกัน', 'สายลับ', 'ภารกิจ', 'นักฆ่า'],
  thriller: ['thriller', 'suspense', 'survival', 'intense', 'ระทึก', 'ลุ้น', 'เอาชีวิตรอด', 'หนีตาย', 'กดดัน'],
  crime: ['crime', 'murder', 'detective', 'police', 'case', 'investigation', 'อาชญากรรม', 'ฆาตกรรม', 'สืบสวน', 'นักสืบ', 'ตำรวจ', 'คดี'],
  mystery: ['mystery', 'secret', 'unknown', 'ปริศนา', 'ลึกลับ', 'ความลับ'],
  romance: ['romance', 'romantic', 'love', 'relationship', 'couple', 'รัก', 'โรแมนติก', 'ความรัก', 'คู่รัก'],
  drama: ['drama', 'emotional', 'family', 'life', 'ดราม่า', 'ชีวิต', 'ครอบครัว', 'ซึ้ง'],
  'sci-fi': ['sci-fi', 'science fiction', 'space', 'alien', 'future', 'robot', 'technology', 'ไซไฟ', 'อวกาศ', 'เอเลี่ยน', 'อนาคต', 'หุ่นยนต์'],
  fantasy: ['fantasy', 'magic', 'dragon', 'kingdom', 'wizard', 'myth', 'แฟนตาซี', 'เวทมนตร์', 'มังกร', 'อาณาจักร', 'ย้อนยุค'],
  adventure: ['adventure', 'journey', 'explore', 'ผจญภัย', 'เดินทาง', 'สำรวจ'],
  animation: ['animation', 'anime', 'cartoon', 'animated', 'แอนิเมชัน', 'อนิเมะ', 'การ์ตูน'],
  documentary: ['documentary', 'docu', 'true story', 'สารคดี', 'เรื่องจริง'],
};

const languageAliases: Array<{ language: string; words: string[] }> = [
  { language: 'th', words: ['ไทย', 'หนังไทย', 'ภาษาไทย', 'พากย์ไทย'] },
  { language: 'ko', words: ['เกาหลี', 'korea', 'korean', 'หนังเกาหลี', 'ซีรีส์เกาหลี'] },
  { language: 'ja', words: ['ญี่ปุ่น', 'japan', 'japanese', 'หนังญี่ปุ่น', 'อนิเมะญี่ปุ่น'] },
  { language: 'zh', words: ['จีน', 'china', 'chinese', 'หนังจีน', 'ซีรีส์จีน', 'จีนย้อนยุค'] },
  { language: 'en', words: ['ฝรั่ง', 'อเมริกา', 'อังกฤษ', 'english', 'hollywood', 'ฮอลลีวูด'] },
  { language: 'hi', words: ['อินเดีย', 'บอลลีวูด', 'india', 'hindi'] },
];

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
  is_active?: boolean;
};

type WatchLinkRecord = {
  tmdb_id: number;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
};

type SearchMovieItem = MovieItem & {
  sourceBucket?: string;
  searchAliases?: string[];
  popularity?: number;
  sortScore?: number;
};

type SmartIntent = {
  buckets: string[];
  languages: string[];
  mediaType?: MediaType;
  minRating?: number;
  readyOnly?: boolean;
  preferRecent?: boolean;
  relaxed?: boolean;
  directTerms: string[];
};

function uniqueItems(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(`${item.mediaType}-${item.id}`, item);
  return [...map.values()];
}

function uniqueRows(rows: CatalogRow[]) {
  const map = new Map<string, CatalogRow>();
  for (const row of rows) map.set(`${row.media_type}-${row.tmdb_id}`, row);
  return [...map.values()];
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize('NFKC').replace(/[“”‘’"'`]/g, '').replace(/\s+/g, ' ').trim();
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(normalizeText(word)));
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
  const list: string[] = [];
  if (item.isWatchReady) list.push('พร้อมดู', 'HD');
  if (item.rating >= 8) list.push('8+');
  if (item.rating >= 6.5) list.push('6.5+');
  if (item.language === 'th') list.push('พากย์ไทย');
  return list.slice(0, 3);
}

function aliasesForRow(row: CatalogRow) {
  const text = normalizeText([row.title, row.title_en, row.overview, row.source_bucket, row.language, ...(row.genres || [])].filter(Boolean).join(' '));
  const aliases: string[] = [];

  for (const [bucket, words] of Object.entries(bucketKeywords)) {
    if (row.source_bucket === bucket || includesAny(text, [bucket, ...words])) aliases.push(bucket, ...words);
  }

  for (const { language, words } of languageAliases) {
    if (String(row.language || '').toLowerCase() === language || includesAny(text, words)) aliases.push(language, ...words);
  }

  if (row.media_type === 'movie') aliases.push('movie', 'หนัง', 'ภาพยนตร์');
  if (row.media_type === 'tv') aliases.push('tv', 'series', 'ซีรีส์', 'ละคร');
  if (Number(row.rating || 0) >= 6.5) aliases.push('คะแนนดี', 'คะแนนสูง', 'น่าดู', '6.5+');
  if (Number(row.rating || 0) >= 8) aliases.push('8+', 'ยอดนิยม');

  return [...new Set(aliases)];
}

function rowToMovie(row: CatalogRow, links: Map<string, WatchLinkRecord>): SearchMovieItem {
  const rating = Number(row.rating || 0);
  const link = links.get(watchKey(row.media_type, Number(row.tmdb_id)));
  const watchUrl = normalizeDrivePreviewUrl(link?.watch_url);
  const trailerUrl = normalizeDrivePreviewUrl(link?.trailer_url);
  const title = link?.title_th || link?.title || row.title || row.title_en || `รายการ ${row.tmdb_id}`;
  const base: SearchMovieItem = {
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
    sourceBucket: row.source_bucket || undefined,
    searchAliases: aliasesForRow(row),
    popularity: Number(row.popularity || 0),
    sortScore: Number(row.sort_score || 0),
  };

  return { ...base, badges: badges(base) };
}

function itemText(item: MovieItem) {
  const searchItem = item as SearchMovieItem;
  return normalizeText([
    item.title,
    item.titleEn,
    item.overview,
    item.year,
    item.language,
    item.mediaType,
    item.status,
    item.label,
    searchItem.sourceBucket,
    ...(item.genres || []),
    ...(item.badges || []),
    ...(searchItem.searchAliases || []),
  ].filter(Boolean).join(' '));
}

function detectIntent(query: string): SmartIntent {
  const text = normalizeText(query);
  const buckets = new Set<string>();
  const languages = new Set<string>();
  let mediaType: MediaType | undefined;
  let minRating: number | undefined;
  let readyOnly = false;
  let preferRecent = false;
  let relaxed = false;

  for (const [bucket, words] of Object.entries(bucketKeywords)) {
    if (includesAny(text, words)) buckets.add(bucket);
  }

  for (const { language, words } of languageAliases) {
    if (includesAny(text, words)) languages.add(language);
  }

  if (/(ซีรีส์|series|tv|ละคร)/i.test(text)) mediaType = 'tv';
  if (/(หนัง|ภาพยนตร์|movie|film)/i.test(text)) mediaType = 'movie';
  if (/(คะแนนดี|คะแนนสูง|น่าดู|rating|rated|6\.5\+|8\+)/i.test(text)) minRating = text.includes('8+') ? 8 : 6.5;
  if (/(พร้อมดู|ดูได้|รับชม|hd)/i.test(text)) readyOnly = true;
  if (/(ปีใหม่|ใหม่|ล่าสุด|2026|2025|2024)/i.test(text)) preferRecent = true;
  if (/(ไม่เครียด|ดูสบาย|เบาสมอง|คืนนี้|แนะนำ|ไม่โหดมาก)/i.test(text)) relaxed = true;

  if (/(คล้าย|เหมือน|similar|john wick|จอห์นวิค|จอนวิค)/i.test(text)) {
    buckets.add('action');
    buckets.add('thriller');
    buckets.add('crime');
    mediaType = mediaType || 'movie';
    minRating = minRating || 6.5;
  }

  if (/(ย้อนยุค|พีเรียด|period|ancient|historical)/i.test(text)) {
    buckets.add('drama');
    buckets.add('fantasy');
  }

  if (/(เอาชีวิตรอด|survival|หนีตาย|ติดเกาะ|โลกแตก)/i.test(text)) {
    buckets.add('thriller');
    buckets.add('adventure');
    buckets.add('sci-fi');
  }

  if (relaxed && !buckets.size) {
    buckets.add('comedy');
    buckets.add('romance');
    buckets.add('animation');
    minRating = minRating || 6.5;
  }

  const genericWords = [
    'หนัง', 'ภาพยนตร์', 'ซีรีส์', 'series', 'movie', 'film', 'ขอ', 'อยากดู', 'ช่วยหา', 'แนะนำ', 'คะแนนดี', 'คะแนนสูง', 'น่าดู', 'ปีใหม่', 'ใหม่', 'ล่าสุด', 'คล้าย', 'เหมือน', 'ไม่เครียด', 'คืนนี้', 'พร้อมดู', 'ดูได้',
    ...Object.values(bucketKeywords).flat(),
    ...languageAliases.flatMap((item) => item.words),
  ].map(normalizeText);

  const directTerms = text
    .replace(/[*,()]/g, ' ')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && !genericWords.includes(term))
    .slice(0, 4);

  return {
    buckets: [...buckets],
    languages: [...languages],
    mediaType,
    minRating,
    readyOnly,
    preferRecent,
    relaxed,
    directTerms,
  };
}

function matchesIntent(item: MovieItem, intent: SmartIntent, hasRawQuery: boolean) {
  const text = itemText(item);
  const searchItem = item as SearchMovieItem;

  if (!hasRawQuery) return true;
  if (intent.mediaType && item.mediaType !== intent.mediaType) return false;
  if (intent.languages.length && !intent.languages.includes(String(item.language || '').toLowerCase())) return false;
  if (intent.readyOnly && !(item.isWatchReady || item.watchUrl || item.status === 'published')) return false;
  if (intent.minRating && item.rating < intent.minRating) return false;
  if (intent.buckets.length) {
    const bucketMatch = intent.buckets.some((bucket) => {
      const words = bucketKeywords[bucket] || [bucket];
      return searchItem.sourceBucket === bucket || includesAny(text, [bucket, ...words]);
    });
    if (!bucketMatch) return false;
  }

  if (intent.buckets.length || intent.languages.length || intent.mediaType || intent.minRating || intent.readyOnly || intent.relaxed) return true;
  if (!intent.directTerms.length) return true;
  return intent.directTerms.every((term) => text.includes(term));
}

function relevanceScore(item: MovieItem, intent: SmartIntent, rawQuery: string) {
  const text = itemText(item);
  const searchItem = item as SearchMovieItem;
  const title = normalizeText(item.title || '');
  const titleEn = normalizeText(item.titleEn || '');
  const raw = normalizeText(rawQuery);
  let score = Number(searchItem.sortScore || 0) / 1000 + item.rating * 8 + Number(searchItem.popularity || 0) / 200;

  if (raw && title.includes(raw)) score += 180;
  if (raw && titleEn.includes(raw)) score += 150;
  for (const term of intent.directTerms) {
    if (title.includes(term)) score += 80;
    else if (titleEn.includes(term)) score += 70;
    else if (text.includes(term)) score += 24;
  }

  for (const bucket of intent.buckets) {
    const words = bucketKeywords[bucket] || [bucket];
    if (searchItem.sourceBucket === bucket) score += 80;
    if (includesAny(text, [bucket, ...words])) score += 36;
  }
  for (const language of intent.languages) {
    if (String(item.language || '').toLowerCase() === language) score += 58;
  }
  if (intent.mediaType && item.mediaType === intent.mediaType) score += 32;
  if (intent.readyOnly && item.isWatchReady) score += 40;
  if (intent.preferRecent) score += Math.max(0, Number(item.year || 0) - 2018) * 4;
  return score;
}

function itemYear(item: MovieItem) {
  const year = Number(item.year || 0);
  return Number.isFinite(year) ? year : 0;
}

function matchesYear(item: MovieItem, yearFilter: string) {
  if (!yearFilter) return true;
  const year = itemYear(item);
  if (!year) return false;
  if (/^\d{4}$/.test(yearFilter)) return String(year) === yearFilter;
  if (yearFilter === '2020s') return year >= 2020 && year <= 2029;
  if (yearFilter === '2010s') return year >= 2010 && year <= 2019;
  if (yearFilter === 'before-2010') return year < 2010;
  return true;
}

function matchesLanguage(item: MovieItem, language: string) {
  if (!language) return true;
  return String(item.language || '').toLowerCase() === language;
}

function matchesCountry(item: MovieItem, country: string) {
  if (!country) return true;
  const accepted = countryLanguage[country] || [country];
  return accepted.includes(String(item.language || '').toLowerCase());
}

function matchesQuality(item: MovieItem, quality: string) {
  if (!quality) return true;
  if (quality === 'ready') return Boolean(item.isWatchReady || item.watchUrl || item.status === 'published');
  if (quality === 'hd') return Boolean(item.isWatchReady || item.watchUrl);
  if (quality === 'review') return item.status === 'review' || !item.isWatchReady;
  return true;
}

function applyFilters(items: MovieItem[], filters: URLSearchParams, intent: SmartIntent, rawQuery: string) {
  const mediaType = filters.get('type') || '';
  const country = filters.get('country') || '';
  const language = filters.get('language') || '';
  const quality = filters.get('quality') || '';
  const year = filters.get('year') || '';
  const sort = filters.get('sort') || 'rating-desc';
  const hasRawQuery = Boolean(rawQuery.trim());

  const filtered = items.filter((item) => {
    if (!matchesIntent(item, intent, hasRawQuery)) return false;
    if (mediaType && item.mediaType !== mediaType) return false;
    if (!matchesCountry(item, country)) return false;
    if (!matchesLanguage(item, language)) return false;
    if (!matchesQuality(item, quality)) return false;
    if (!matchesYear(item, year)) return false;
    return true;
  });

  if (hasRawQuery) return filtered.sort((a, b) => relevanceScore(b, intent, rawQuery) - relevanceScore(a, intent, rawQuery));

  return filtered.sort((a, b) => {
    if (sort === 'rating-asc') return a.rating - b.rating || itemYear(b) - itemYear(a);
    if (sort === 'year-desc') return itemYear(b) - itemYear(a) || b.rating - a.rating;
    if (sort === 'year-asc') return itemYear(a) - itemYear(b) || b.rating - a.rating;
    return b.rating - a.rating || itemYear(b) - itemYear(a);
  });
}

function termFilter(terms: string[]) {
  if (!terms.length) return '';
  return `&or=(${terms.map((term) => {
    const value = encodeURIComponent(`*${term}*`);
    return `title.ilike.${value},title_en.ilike.${value},overview.ilike.${value}`;
  }).join(',')})`;
}

function catalogSelect() {
  return 'select=tmdb_id,media_type,title,title_en,overview,poster_url,backdrop_url,rating,vote_count,popularity,release_year,release_date,genres,language,runtime,source_bucket,sort_score,is_active&is_active=eq.true';
}

async function fetchCatalogRows(extraFilter: string, limit: number) {
  return supabaseRest<CatalogRow[]>(
    `tmdb_catalog?${catalogSelect()}${extraFilter}&order=sort_score.desc.nullslast,rating.desc&limit=${limit}`,
    { mode: 'service', next: { revalidate: 120 } },
  ).catch(() => []);
}

async function fetchWatchReadyRows(fetchLimit: number) {
  const links = await supabaseRest<WatchLinkRecord[]>(
    `admin_movie_links?is_active=eq.true&watch_url=not.is.null&select=tmdb_id,media_type,title,title_th,watch_url,trailer_url&order=updated_at.desc.nullslast&limit=${fetchLimit}`,
    { mode: 'service', next: { revalidate: 120 } },
  ).catch(() => []);
  const ids = [...new Set((links || []).map((link) => Number(link.tmdb_id)).filter(Boolean))];
  if (!ids.length) return [];
  return fetchCatalogRows(`&tmdb_id=in.(${ids.join(',')})`, Math.min(fetchLimit, 600));
}

async function fetchWatchLinks(rows: CatalogRow[]) {
  const ids = [...new Set(rows.map((row) => Number(row.tmdb_id)).filter(Boolean))];
  if (!ids.length) return new Map<string, WatchLinkRecord>();

  const linkRows = await supabaseRest<WatchLinkRecord[]>(
    `admin_movie_links?is_active=eq.true&tmdb_id=in.(${ids.join(',')})&select=tmdb_id,media_type,title,title_th,watch_url,trailer_url`,
    { mode: 'service', next: { revalidate: 60 } },
  ).catch(() => []);

  const map = new Map<string, WatchLinkRecord>();
  for (const link of linkRows || []) {
    if (!link.tmdb_id || !link.media_type) continue;
    map.set(watchKey(link.media_type, Number(link.tmdb_id)), link);
  }
  return map;
}

async function rowsForSearch(query: string, category: string, limit: number, offset: number, intent: SmartIntent) {
  const isKnownCategory = category && knownSlugPattern.test(category);
  const fetchLimit = Math.min(Math.max((offset + limit) * 8, 96), 720);

  if (category === 'watch-ready') return fetchWatchReadyRows(fetchLimit);

  if (isKnownCategory) {
    const bucketFilter = category !== 'watch-ready' ? `&source_bucket=eq.${encodeURIComponent(category)}` : '';
    return fetchCatalogRows(bucketFilter, fetchLimit);
  }

  const rowGroups: CatalogRow[][] = [];

  for (const bucket of intent.buckets.slice(0, 4)) {
    rowGroups.push(await fetchCatalogRows(`&source_bucket=eq.${encodeURIComponent(bucket)}`, fetchLimit));
  }

  for (const language of intent.languages.slice(0, 3)) {
    rowGroups.push(await fetchCatalogRows(`&language=eq.${encodeURIComponent(language)}`, fetchLimit));
  }

  if (intent.mediaType) {
    rowGroups.push(await fetchCatalogRows(`&media_type=eq.${intent.mediaType}`, Math.min(fetchLimit, 360)));
  }

  if (intent.directTerms.length) {
    rowGroups.push(await fetchCatalogRows(termFilter(intent.directTerms), fetchLimit));
  }

  if (!rowGroups.length) {
    rowGroups.push(await fetchCatalogRows('', fetchLimit));
  }

  const merged = uniqueRows(rowGroups.flat());
  if (merged.length >= offset + limit || !query.trim()) return merged;

  const broad = await fetchCatalogRows('', fetchLimit);
  return uniqueRows([...merged, ...broad]);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const limit = Math.max(1, Math.min(Number(searchParams.get('limit') || 24), 48));
  const offset = Math.max(0, Math.min(Number(searchParams.get('offset') || 0), 600));
  const intent = detectIntent(query);

  const rows = await rowsForSearch(query, category, limit, offset, intent);
  const links = await fetchWatchLinks(rows);
  const baseItems = rows.map((row) => rowToMovie(row, links));
  const filteredItems = applyFilters(uniqueItems(baseItems), searchParams, intent, query);
  const items = filteredItems.slice(offset, offset + limit);
  const hasMore = filteredItems.length > offset + items.length;

  return NextResponse.json({ ok: true, items, total: filteredItems.length, hasMore, offset }, { headers: CACHE_HEADERS });
}
