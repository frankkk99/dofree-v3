import type { HomePayload, MovieItem, MovieSection } from './tmdb';

type TmdbMovie = {
  id: number;
  title?: string;
  original_title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  release_date?: string;
  genre_ids?: number[];
  original_language?: string;
  adult?: boolean;
  popularity?: number;
};

type TmdbResponse = { results?: TmdbMovie[] } | null;

type ReleaseMovie = MovieItem & {
  releaseDate?: string;
  popularity?: number;
};

const imageBase = 'https://image.tmdb.org/t/p/original';
const posterBase = 'https://image.tmdb.org/t/p/w500';
const fallbackImage = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80';
export const TMDB_RELEASE_SECTION_LIMIT = 36;
export const TMDB_HERO_ITEMS_LIMIT = 24;

const genreNames: Record<number, string> = {
  28: 'แอ็กชัน',
  12: 'ผจญภัย',
  16: 'แอนิเมชัน',
  18: 'ดราม่า',
  27: 'สยองขวัญ',
  35: 'คอมเมดี้',
  53: 'ระทึกขวัญ',
  878: 'ไซไฟ',
  10749: 'โรแมนติก',
  99: 'สารคดี',
  14: 'แฟนตาซี',
  80: 'อาชญากรรม',
  9648: 'ลึกลับ',
  10751: 'ครอบครัว',
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function releaseWindow() {
  const todayDate = new Date();
  const fromDate = addMonths(todayDate, -1);
  const toDate = addMonths(todayDate, 12);
  return {
    today: isoDate(todayDate),
    from: isoDate(fromDate),
    to: isoDate(toDate),
  };
}

async function tmdb<T = unknown>(path: string): Promise<T | null> {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) return null;

  const response = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    next: { revalidate: 60 * 30 },
  });

  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

async function tmdbPages(basePath: string, pages = 3) {
  const joiner = basePath.includes('?') ? '&' : '?';
  const responses = await Promise.all(
    Array.from({ length: pages }, (_, index) => tmdb<TmdbResponse>(`${basePath}${joiner}page=${index + 1}`)),
  );
  return responses.flatMap((response) => response?.results || []);
}

function validMovie(movie: TmdbMovie, from: string, to: string) {
  const releaseDate = movie.release_date || '';
  return Boolean(
    movie.id &&
    releaseDate &&
    releaseDate >= from &&
    releaseDate <= to &&
    !movie.adult &&
    (movie.poster_path || movie.backdrop_path) &&
    (movie.title || movie.original_title)
  );
}

function badges(movie: ReleaseMovie, index: number) {
  const releaseDate = movie.releaseDate || '';
  const today = isoDate(new Date());
  const items: string[] = [];
  if (releaseDate > today) items.push('เร็ว ๆ นี้');
  else items.push('เข้าใหม่');
  if (movie.rating >= 8) items.push('8+');
  if (movie.language === 'th') items.push('พากย์ไทย');
  if (index < 4) items.push('ใหม่');
  return [...new Set(items)].slice(0, 3);
}

function toMovieItem(movie: TmdbMovie, index: number): ReleaseMovie {
  const posterUrl = movie.poster_path ? `${posterBase}${movie.poster_path}` : fallbackImage;
  const backdropUrl = movie.backdrop_path ? `${imageBase}${movie.backdrop_path}` : movie.poster_path ? `${posterBase}${movie.poster_path}` : fallbackImage;
  const title = movie.title || movie.original_title || `ภาพยนตร์ ${movie.id}`;
  const rating = Number(movie.vote_average || 0);
  const releaseDate = movie.release_date || '';
  const base: ReleaseMovie = {
    id: movie.id,
    mediaType: 'movie',
    title,
    titleEn: movie.original_title || title,
    overview: movie.overview || 'ข้อมูลภาพยนตร์อัปเดตตามรอบฉายใหม่และกำหนดฉายในอนาคต',
    posterUrl,
    backdropUrl,
    rating,
    year: releaseDate.slice(0, 4) || 'ไม่ระบุ',
    releaseDate,
    genres: (movie.genre_ids || []).slice(0, 3).map((id) => genreNames[id] || 'ภาพยนตร์'),
    language: movie.original_language || undefined,
    status: releaseDate > isoDate(new Date()) ? 'review' : rating >= 7 ? 'review' : 'draft',
    isWatchReady: false,
    label: releaseDate > isoDate(new Date()) ? 'เร็ว ๆ นี้' : 'เข้าใหม่',
    popularity: Number(movie.popularity || 0),
    badges: [],
  };
  return { ...base, badges: badges(base, index) };
}

function unique(items: ReleaseMovie[]) {
  const map = new Map<number, ReleaseMovie>();
  for (const item of items) map.set(item.id, item);
  return [...map.values()];
}

function sortReleaseWindow(items: ReleaseMovie[]) {
  const today = isoDate(new Date());
  return [...items].sort((a, b) => {
    const ad = a.releaseDate || '';
    const bd = b.releaseDate || '';
    const au = ad >= today;
    const bu = bd >= today;
    if (au && bu) return ad.localeCompare(bd) || (b.popularity || 0) - (a.popularity || 0);
    if (au !== bu) return au ? -1 : 1;
    return bd.localeCompare(ad) || (b.popularity || 0) - (a.popularity || 0);
  });
}

function inReleaseWindow(item: ReleaseMovie, range = releaseWindow()) {
  const date = item.releaseDate || '';
  return date >= range.from && date <= range.to;
}

async function getFreshReleaseMovies() {
  const range = releaseWindow();
  const path = `/discover/movie?language=th-TH&region=TH&include_adult=false&sort_by=popularity.desc&primary_release_date.gte=${range.from}&primary_release_date.lte=${range.to}`;
  const rows = await tmdbPages(path, 5);
  return sortReleaseWindow(unique(rows.filter((movie) => validMovie(movie, range.from, range.to)).map(toMovieItem)));
}

export async function getFreshComingSoonItems(limit = TMDB_RELEASE_SECTION_LIMIT, offset = 0): Promise<MovieItem[]> {
  const range = releaseWindow();
  const movies = await getFreshReleaseMovies().catch(() => []);
  const safeLimit = Math.max(1, Math.min(Number(limit) || TMDB_RELEASE_SECTION_LIMIT, TMDB_RELEASE_SECTION_LIMIT));
  const safeOffset = Math.max(Number(offset) || 0, 0);
  return movies
    .filter((item) => inReleaseWindow(item, range))
    .slice(safeOffset, safeOffset + safeLimit);
}

export async function decorateHomeWithFreshTmdbReleases(home: HomePayload): Promise<HomePayload> {
  const range = releaseWindow();
  const movies = await getFreshReleaseMovies().catch(() => []);
  if (!movies.length) return home;

  const heroItems = movies.filter((item) => item.backdropUrl || item.posterUrl).slice(0, TMDB_HERO_ITEMS_LIMIT);
  const upcomingItems = movies.filter((item) => {
    const date = item.releaseDate || '';
    return date >= range.from && date <= range.to;
  }).slice(0, TMDB_RELEASE_SECTION_LIMIT);
  const comingSoonSection: MovieSection | null = upcomingItems.length
    ? {
      slug: 'coming-soon',
      eyebrow: 'COMING SOON',
      title: 'เร็ว ๆ นี้',
      description: 'หนังใหม่ หนังใกล้เข้าฉาย และกำหนดฉายล่าสุดจาก TMDB',
      items: upcomingItems,
    }
    : null;

  const sections = comingSoonSection
    ? [comingSoonSection, ...home.sections.filter((section) => section.slug !== 'coming-soon')]
    : home.sections;

  return {
    ...home,
    hero: heroItems[0] || home.hero,
    heroItems: heroItems.length ? heroItems : home.heroItems,
    sections,
  };
}
