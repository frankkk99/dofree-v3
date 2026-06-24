export type MediaType = 'movie' | 'tv';
export type MovieStatus = 'draft' | 'review' | 'published' | 'broken' | 'hidden';

export type MovieItem = {
  id: number;
  mediaType: MediaType;
  title: string;
  titleEn?: string;
  overview?: string;
  posterUrl: string;
  backdropUrl: string;
  rating: number;
  year: string;
  releaseDate?: string;
  genres?: string[];
  runtime?: number;
  language?: string;
  status?: MovieStatus;
  isWatchReady?: boolean;
  watchUrl?: string;
  trailerUrl?: string;
  label?: string;
  badges?: string[];
};

export type MovieSection = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  items: MovieItem[];
};

export type HomePayload = {
  hero: MovieItem;
  heroItems: MovieItem[];
  sections: MovieSection[];
  source: 'tmdb' | 'fallback';
};

export type DetailPayload = {
  item: MovieItem;
  cast: { id: number; name: string; character?: string; profileUrl?: string }[];
  trailerUrl?: string;
  recommendations: MovieItem[];
  source: 'tmdb' | 'fallback';
};

type TmdbItem = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  runtime?: number;
  episode_run_time?: number[];
  original_language?: string;
  genres?: { id: number; name: string }[];
  adult?: boolean;
};
type TmdbVideo = { site?: string; key?: string; type?: string; official?: boolean };
type TmdbCast = { id: number; name: string; character?: string; profile_path?: string | null };
type TmdbResponse = { results?: TmdbItem[] } | null;
type WatchLinkRecord = {
  tmdb_id: number;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  notes?: string | null;
  section_slug?: string | null;
  status?: MovieStatus | null;
};

const apiBase = 'https://api.themoviedb.org/3';
const imageBase = 'https://image.tmdb.org/t/p/original';
const posterBase = 'https://image.tmdb.org/t/p/w500';
const fallbackBackdrop = 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1800&q=80';
const fallbackPoster = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80';
const minTmdbRating = 6.5;
const minTmdbVotes = 80;

const movieGenres: Record<number, string> = {
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

const staticFallback: MovieItem[] = [
  {
    id: 1,
    mediaType: 'movie',
    title: 'มอร์ทัล คอมแบท 2',
    titleEn: 'Mortal Kombat 2',
    overview: 'นักสู้จากโลกมนุษย์ต้องเผชิญบททดสอบครั้งใหม่ในทัวร์นาเมนต์ที่เดิมพันด้วยชะตาของทุกอาณาจักร',
    posterUrl: fallbackPoster,
    backdropUrl: fallbackBackdrop,
    rating: 8,
    year: '2026',
    releaseDate: '2026-01-01',
    genres: ['แอ็กชัน', 'แฟนตาซี'],
    runtime: 112,
    language: 'th',
    status: 'published',
    isWatchReady: true,
    watchUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trailerUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    label: 'พร้อมดู',
    badges: ['พร้อมดู', '8+', 'HD'],
  },
];

function tmdbHeaders() {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) return null;
  return { Authorization: `Bearer ${token}`, accept: 'application/json' };
}

async function tmdbFetch<T>(path: string): Promise<T | null> {
  const headers = tmdbHeaders();
  if (!headers) return null;

  try {
    const response = await fetch(`${apiBase}${path}`, { headers, next: { revalidate: 1800 } });
    if (!response.ok) return null;
    return response.json() as Promise<T>;
  } catch {
    return null;
  }
}

function isQualified(item: TmdbItem) {
  const rating = item.vote_average || 0;
  const votes = item.vote_count || 0;
  const hasTitle = Boolean(item.title || item.name || item.original_title || item.original_name);
  const hasImage = Boolean(item.poster_path || item.backdrop_path);
  return hasTitle && hasImage && !item.adult && rating >= minTmdbRating && votes >= minTmdbVotes;
}

function toMovieItem(item: TmdbItem, mediaType: MediaType, index = 0): MovieItem {
  const title = item.title || item.name || item.original_title || item.original_name || 'Untitled';
  const releaseDate = item.release_date || item.first_air_date || undefined;
  const year = releaseDate ? releaseDate.slice(0, 4) : 'ไม่ระบุ';
  const rating = Number(item.vote_average || 0);
  const genreIds = item.genre_ids || item.genres?.map((genre) => genre.id) || [];
  const genres = genreIds.map((id) => movieGenres[id] || 'ภาพยนตร์').filter(Boolean);
  const runtime = item.runtime || item.episode_run_time?.[0];

  return {
    id: item.id,
    mediaType,
    title,
    titleEn: item.original_title || item.original_name,
    overview: item.overview || 'ค้นพบเรื่องราวใหม่ พร้อมข้อมูลภาพยนตร์ ตัวอย่าง นักแสดง และสถานะการรับชมที่ชัดเจน',
    posterUrl: item.poster_path ? `${posterBase}${item.poster_path}` : fallbackPoster,
    backdropUrl: item.backdrop_path ? `${imageBase}${item.backdrop_path}` : item.poster_path ? `${imageBase}${item.poster_path}` : fallbackBackdrop,
    rating,
    year,
    releaseDate,
    genres,
    runtime,
    language: item.original_language,
    status: rating >= 8 ? 'review' : 'draft',
    isWatchReady: false,
    label: rating >= 8 ? '8+' : '6.5+',
    badges: [rating >= 8 ? '8+' : '6.5+', index < 6 ? 'ใหม่' : 'HD'].filter(Boolean),
  };
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

async function fetchWatchLinks() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!baseUrl || !key) return new Map<string, WatchLinkRecord>();

    const response = await fetch(`${baseUrl}/rest/v1/admin_movie_links?is_active=eq.true&select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 60 },
    });
    if (!response.ok) return new Map<string, WatchLinkRecord>();

    const rows = (await response.json()) as WatchLinkRecord[];
    return new Map(rows.map((row) => [`${row.media_type}-${row.tmdb_id}`, row]));
  } catch {
    return new Map<string, WatchLinkRecord>();
  }
}

function applyWatchLink(item: MovieItem, links: Map<string, WatchLinkRecord>) {
  const link = links.get(`${item.mediaType}-${item.id}`);
  if (!link) return item;

  return {
    ...item,
    title: link.title_th || item.title,
    titleEn: link.title || item.titleEn,
    watchUrl: normalizeDrivePreviewUrl(link.watch_url),
    trailerUrl: normalizeDrivePreviewUrl(link.trailer_url) || item.trailerUrl,
    status: (link.status || 'published') as MovieStatus,
    isWatchReady: Boolean(link.watch_url),
    label: link.section_slug === 'watch-ready' || link.watch_url ? 'พร้อมดู' : item.label,
    badges: [link.watch_url ? 'พร้อมดู' : item.label, item.rating >= 8 ? '8+' : '6.5+', 'HD'].filter(Boolean) as string[],
  } satisfies MovieItem;
}

async function fetchList(path: string, mediaType: MediaType, limit = 18) {
  const data = await tmdbFetch<TmdbResponse>(path);
  return (data?.results || [])
    .filter(isQualified)
    .slice(0, limit)
    .map((item, index) => toMovieItem(item, mediaType, index));
}

async function buildSection(slug: string, title: string, eyebrow: string, description: string, path: string, mediaType: MediaType, limit = 18): Promise<MovieSection> {
  const items = await fetchList(path, mediaType, limit);
  return { slug, title, eyebrow, description, items };
}

function mergeWatchReady(items: MovieItem[], links: Map<string, WatchLinkRecord>) {
  return items.map((item) => applyWatchLink(item, links));
}

function unique(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(`${item.mediaType}-${item.id}`, item);
  return [...map.values()];
}

export async function getHomePayload(): Promise<HomePayload> {
  const links = await fetchWatchLinks();
  const sourceSections = await Promise.all([
    buildSection('top-rated', 'คะแนนสูง น่าดู', 'Top Rated', 'คัดหนังคะแนนดีจาก TMDB', '/movie/top_rated?language=th-TH', 'movie', 24),
    buildSection('popular', 'ยอดนิยมตอนนี้', 'Trending Mood', 'รายการที่คนกำลังสนใจ', '/movie/popular?language=th-TH&region=TH', 'movie', 24),
    buildSection('now-playing', 'หนังเข้าใหม่', 'Now Playing', 'ภาพยนตร์ที่กำลังเข้าฉายและเพิ่งเข้า', '/movie/now_playing?language=th-TH&region=TH', 'movie', 20),
    buildSection('series', 'ซีรีส์น่าดู', 'Series', 'รายการทีวีและซีรีส์ยอดนิยม', '/tv/popular?language=th-TH', 'tv', 20),
    buildSection('thai', 'หนังไทยและเอเชีย', 'Local Picks', 'คัดสำหรับผู้ชมไทย', '/discover/movie?language=th-TH&with_original_language=th&sort_by=vote_average.desc&vote_count.gte=80', 'movie', 18),
    buildSection('action', 'แอ็กชันเดือด', 'Action', 'ฉากมันส์ จังหวะเร็ว', '/discover/movie?language=th-TH&with_genres=28&sort_by=vote_average.desc&vote_count.gte=80', 'movie', 18),
    buildSection('horror', 'สยองขวัญ', 'Horror', 'บรรยากาศมืด ลุ้น และหลอน', '/discover/movie?language=th-TH&with_genres=27&sort_by=vote_average.desc&vote_count.gte=80', 'movie', 18),
    buildSection('comedy', 'คอมเมดี้ดูง่าย', 'Comedy', 'คลายเครียดและสนุก', '/discover/movie?language=th-TH&with_genres=35&sort_by=vote_average.desc&vote_count.gte=80', 'movie', 18),
  ]);

  const hydratedSections = sourceSections
    .map((section) => ({ ...section, items: mergeWatchReady(section.items, links) }))
    .filter((section) => section.items.length > 0);

  const allItems = unique(hydratedSections.flatMap((section) => section.items));
  const readyItems = allItems.filter((item) => item.isWatchReady && item.watchUrl);

  const watchReadySection: MovieSection = {
    slug: 'watch-ready',
    title: 'พร้อมดูตอนนี้',
    eyebrow: 'Premium Ready',
    description: 'รายการที่แอดมินใส่ลิงก์รับชมแล้ว',
    items: readyItems.length ? readyItems : staticFallback,
  };

  const heroCandidates = unique([...readyItems, ...allItems]).filter((item) => item.backdropUrl);
  const heroItems = heroCandidates.length ? heroCandidates.slice(0, 10) : staticFallback;
  const hero = heroItems[0];

  return {
    hero,
    heroItems,
    sections: [watchReadySection, ...hydratedSections],
    source: tmdbHeaders() ? 'tmdb' : 'fallback',
  };
}

export async function getDetailPayload(mediaType: MediaType, id: number): Promise<DetailPayload> {
  const links = await fetchWatchLinks();
  const detail = await tmdbFetch<TmdbItem>(`/${mediaType}/${id}?language=th-TH`);
  const videos = await tmdbFetch<{ results?: TmdbVideo[] }>(`/${mediaType}/${id}/videos?language=en-US`);
  const credits = await tmdbFetch<{ cast?: TmdbCast[] }>(`/${mediaType}/${id}/credits?language=th-TH`);
  const recommendations = await tmdbFetch<TmdbResponse>(`/${mediaType}/${id}/recommendations?language=th-TH&page=1`);

  if (!detail) {
    const fallback = staticFallback[0];
    return { item: fallback, cast: [], trailerUrl: fallback.trailerUrl, recommendations: staticFallback, source: 'fallback' };
  }

  const item = applyWatchLink(toMovieItem(detail, mediaType), links);
  const trailer = videos?.results?.find((video) => video.site === 'YouTube' && (video.type === 'Trailer' || video.official));
  const cast = (credits?.cast || []).slice(0, 10).map((member) => ({
    id: member.id,
    name: member.name,
    character: member.character,
    profileUrl: member.profile_path ? `${posterBase}${member.profile_path}` : undefined,
  }));

  const recs = (recommendations?.results || [])
    .filter(isQualified)
    .slice(0, 12)
    .map((movie, index) => applyWatchLink(toMovieItem(movie, mediaType, index), links));

  return {
    item: { ...item, trailerUrl: item.trailerUrl || (trailer ? `https://www.youtube.com/embed/${trailer.key}` : undefined) },
    trailerUrl: item.trailerUrl || (trailer ? `https://www.youtube.com/embed/${trailer.key}` : undefined),
    cast,
    recommendations: recs.length ? recs : staticFallback,
    source: tmdbHeaders() ? 'tmdb' : 'fallback',
  };
}
