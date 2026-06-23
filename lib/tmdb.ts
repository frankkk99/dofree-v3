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
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  runtime?: number;
  episode_run_time?: number[];
  original_language?: string;
  genres?: { id: number; name: string }[];
};

type TmdbVideo = {
  site?: string;
  key?: string;
  type?: string;
  official?: boolean;
};

type TmdbCast = {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
};

type WatchLinkRecord = {
  tmdb_id: number;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  notes?: string | null;
};

type WatchLinkLookup = Map<string, WatchLinkRecord>;

const imageBase = 'https://image.tmdb.org/t/p/original';
const posterBase = 'https://image.tmdb.org/t/p/w500';
const profileBase = 'https://image.tmdb.org/t/p/w185';

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
};

const fallbackImages = [
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1400&q=80',
];

const fallbackTitles = ['เงามรณะ', 'รหัสคืนฝน', 'เมืองหลังเงา', 'ประตูเวลามืด', 'สัญญาณสุดท้าย'];

function demoWatchUrl(item: Pick<MovieItem, 'id' | 'mediaType'>) {
  return `/watch-ready?play=${item.mediaType}-${item.id}`;
}

function demoTrailerUrl(title: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} trailer`)}`;
}

function deriveStatus(rating: number, index: number): MovieStatus {
  if (rating >= 8 || index % 5 === 0) return 'review';
  if (index % 7 === 0) return 'review';
  return 'draft';
}

function buildBadges(item: { rating: number; status?: MovieStatus; language?: string; isWatchReady?: boolean }, index: number) {
  const badges: string[] = [];
  if (item.isWatchReady) badges.push('พร้อมดู');
  if (item.rating >= 8) badges.push('8+');
  if (index < 4) badges.push('ใหม่');
  if (item.language === 'th') badges.push('พากย์ไทย');
  badges.push('HD');
  return badges.slice(0, 3);
}

function watchLinkKey(mediaType: MediaType, id: number) {
  return `${mediaType}-${id}`;
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

async function fetchActiveWatchLinks(): Promise<WatchLinkLookup> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const links = new Map<string, WatchLinkRecord>();

  if (!supabaseUrl || !anonKey) return links;

  const endpoint = `${supabaseUrl}/rest/v1/admin_movie_links?is_active=eq.true&watch_url=not.is.null&select=tmdb_id,media_type,title,title_th,watch_url,trailer_url,provider,notes`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        accept: 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) return links;

    const records = (await response.json()) as WatchLinkRecord[];
    for (const record of records) {
      const watchUrl = normalizeDrivePreviewUrl(record.watch_url);
      if (!record.tmdb_id || !record.media_type || !watchUrl) continue;
      links.set(watchLinkKey(record.media_type, record.tmdb_id), { ...record, watch_url: watchUrl });
    }
  } catch {
    return links;
  }

  return links;
}

function applyWatchLink(item: MovieItem, links: WatchLinkLookup, index: number): MovieItem {
  const link = links.get(watchLinkKey(item.mediaType, item.id));

  if (!link) {
    const nextItem = { ...item, isWatchReady: false, watchUrl: undefined };
    return { ...nextItem, badges: buildBadges(nextItem, index) };
  }

  const watchUrl = normalizeDrivePreviewUrl(link.watch_url);
  const trailerUrl = normalizeDrivePreviewUrl(link.trailer_url) || item.trailerUrl;
  const nextItem: MovieItem = {
    ...item,
    title: link.title_th || item.title,
    titleEn: link.title || item.titleEn,
    watchUrl,
    trailerUrl,
    isWatchReady: Boolean(watchUrl),
    status: watchUrl ? 'published' : item.status,
    label: watchUrl ? 'พร้อมดู' : item.label,
  };

  return { ...nextItem, badges: buildBadges(nextItem, index) };
}

function applyWatchLinks(items: MovieItem[], links: WatchLinkLookup, offset = 0) {
  return items.map((item, index) => applyWatchLink(item, links, index + offset));
}

function toMovieItem(item: TmdbItem, mediaType: MediaType, index: number): MovieItem {
  const posterUrl = item.poster_path ? `${posterBase}${item.poster_path}` : fallbackImages[index % fallbackImages.length];
  const backdropUrl = item.backdrop_path ? `${imageBase}${item.backdrop_path}` : fallbackImages[(index + 1) % fallbackImages.length];
  const year = (item.release_date || item.first_air_date || '').slice(0, 4) || '2026';
  const rating = Number(item.vote_average || 0);
  const status = deriveStatus(rating, index);
  const title = item.title || item.name || item.original_title || item.original_name || fallbackTitles[index % fallbackTitles.length];
  const language = item.original_language || 'th';
  const runtime = item.runtime || item.episode_run_time?.[0];
  const genres = item.genres?.length
    ? item.genres.slice(0, 3).map((genre) => genre.name)
    : (item.genre_ids || []).slice(0, 3).map((id) => genreNames[id] || 'ภาพยนตร์');
  const base: MovieItem = {
    id: item.id,
    mediaType,
    title,
    titleEn: item.original_title || item.original_name,
    overview: item.overview || 'ค้นพบเรื่องราวใหม่ พร้อมข้อมูลภาพยนตร์ ตัวอย่าง นักแสดง และสถานะการรับชมที่ชัดเจน',
    posterUrl,
    backdropUrl,
    rating,
    year,
    genres,
    runtime,
    language,
    status,
    isWatchReady: false,
    trailerUrl: demoTrailerUrl(title),
    label: rating >= 8 ? '8+' : index < 3 ? 'ใหม่' : undefined,
  };

  return { ...base, badges: buildBadges(base, index) };
}

function fallbackItem(index: number, overrides: Partial<MovieItem> = {}): MovieItem {
  const rating = 8.1 + (index % 7) / 10;
  const base: MovieItem = {
    id: 9000 + index,
    mediaType: 'movie',
    title: fallbackTitles[index % fallbackTitles.length],
    titleEn: 'DOFree Preview',
    overview: 'ตัวอย่างข้อมูลสำหรับ DOFree v3 เพื่อแสดงโครงหน้าเว็บแบบภาพยนตร์ cinematic พร้อมสถานะรับชมและข้อมูลประกอบ',
    posterUrl: fallbackImages[index % fallbackImages.length],
    backdropUrl: fallbackImages[(index + 1) % fallbackImages.length],
    rating,
    year: String(2026 - (index % 3)),
    genres: ['ระทึกขวัญ', 'ดราม่า'],
    runtime: 112 + index,
    language: index % 3 === 0 ? 'th' : 'en',
    status: 'published',
    isWatchReady: true,
    watchUrl: `/watch-ready?play=fallback-${index}`,
    trailerUrl: demoTrailerUrl(fallbackTitles[index % fallbackTitles.length]),
    label: index % 2 === 0 ? 'ใหม่' : '8+',
  };
  return { ...base, badges: buildBadges(base, index), ...overrides };
}

const fallbackSections: MovieSection[] = [
  {
    slug: 'watch-ready',
    eyebrow: 'พร้อมรับชม',
    title: 'แนะนำสำหรับคุณ',
    description: 'คอนเทนต์พร้อมดูที่คัดไว้สำหรับหน้าแรก',
    items: Array.from({ length: 30 }, (_, index) => fallbackItem(index)),
  },
  {
    slug: 'now-playing',
    eyebrow: 'มาใหม่',
    title: 'ภาพยนตร์มาใหม่',
    description: 'แถวภาพยนตร์ใหม่สำหรับสร้างความรู้สึกสดและมีชีวิต',
    items: Array.from({ length: 30 }, (_, index) => fallbackItem(index + 30, { status: index % 4 === 0 ? 'review' : 'published' })),
  },
  {
    slug: 'popular',
    eyebrow: 'กำลังนิยม',
    title: 'ยอดนิยมตอนนี้',
    description: 'หนังที่เหมาะสำหรับดึงผู้ใช้ให้เลื่อนดูต่อ',
    items: Array.from({ length: 30 }, (_, index) => fallbackItem(index + 60)),
  },
];

const fallback: HomePayload = {
  source: 'fallback',
  hero: fallbackItem(0, { title: 'เงามรณะ', label: 'ใหม่' }),
  heroItems: Array.from({ length: 5 }, (_, index) => fallbackItem(index, { title: fallbackTitles[index] })),
  sections: fallbackSections,
};

async function tmdb(path: string) {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) return null;

  const url = `https://api.themoviedb.org/3${path}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) return null;
  return response.json();
}

async function tmdbCollection(basePath: string, pages = 3) {
  const joiner = basePath.includes('?') ? '&' : '?';
  const responses = await Promise.all(
    Array.from({ length: pages }, (_, index) => tmdb(`${basePath}${joiner}page=${index + 1}`))
  );

  return {
    results: responses.flatMap((response) => response?.results || []),
  };
}

function uniqueItems(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(`${item.mediaType}-${item.id}`, item);
  return [...map.values()];
}

function mapItems(data: { results?: TmdbItem[] } | null, mediaType: MediaType, offset: number, limit = 80) {
  return (data?.results || [])
    .filter((item: TmdbItem) => item.poster_path || item.backdrop_path)
    .slice(0, limit)
    .map((item: TmdbItem, index: number) => toMovieItem(item, mediaType, index + offset));
}

export async function getHomePayload(): Promise<HomePayload> {
  const [
    nowPlaying,
    popular,
    topRated,
    thai,
    tvPopular,
    upcoming,
    action,
    drama,
    thriller,
    horror,
    comedy,
    sciFi,
    romance,
    fantasy,
    documentary,
    watchLinks,
  ] = await Promise.all([
    tmdbCollection('/movie/now_playing?language=th-TH&region=TH', 3),
    tmdbCollection('/movie/popular?language=th-TH&region=TH', 4),
    tmdbCollection('/movie/top_rated?language=th-TH', 4),
    tmdbCollection('/discover/movie?language=th-TH&with_original_language=th&sort_by=popularity.desc', 3),
    tmdbCollection('/tv/popular?language=th-TH', 3),
    tmdbCollection('/movie/upcoming?language=th-TH&region=TH', 3),
    tmdbCollection('/discover/movie?language=th-TH&with_genres=28&sort_by=popularity.desc', 2),
    tmdbCollection('/discover/movie?language=th-TH&with_genres=18&sort_by=popularity.desc', 2),
    tmdbCollection('/discover/movie?language=th-TH&with_genres=53&sort_by=popularity.desc', 2),
    tmdbCollection('/discover/movie?language=th-TH&with_genres=27&sort_by=popularity.desc', 2),
    tmdbCollection('/discover/movie?language=th-TH&with_genres=35&sort_by=popularity.desc', 2),
    tmdbCollection('/discover/movie?language=th-TH&with_genres=878&sort_by=popularity.desc', 2),
    tmdbCollection('/discover/movie?language=th-TH&with_genres=10749&sort_by=popularity.desc', 2),
    tmdbCollection('/discover/movie?language=th-TH&with_genres=14&sort_by=popularity.desc', 2),
    tmdbCollection('/discover/movie?language=th-TH&with_genres=99&sort_by=popularity.desc', 2),
    fetchActiveWatchLinks(),
  ]);

  if (!nowPlaying?.results?.length && !popular?.results?.length && !tvPopular?.results?.length) return fallback;

  const nowItems = applyWatchLinks(mapItems(nowPlaying, 'movie', 0, 60), watchLinks, 0);
  const popularItems = applyWatchLinks(mapItems(popular, 'movie', 80, 80), watchLinks, 80);
  const topItems = applyWatchLinks(mapItems(topRated, 'movie', 180, 80), watchLinks, 180);
  const thaiItems = applyWatchLinks(mapItems(thai, 'movie', 280, 60), watchLinks, 280);
  const tvItems = applyWatchLinks(mapItems(tvPopular, 'tv', 360, 60), watchLinks, 360);
  const upcomingItems = applyWatchLinks(mapItems(upcoming, 'movie', 440, 60), watchLinks, 440);
  const actionItems = applyWatchLinks(mapItems(action, 'movie', 520, 40), watchLinks, 520);
  const dramaItems = applyWatchLinks(mapItems(drama, 'movie', 580, 40), watchLinks, 580);
  const thrillerItems = applyWatchLinks(mapItems(thriller, 'movie', 640, 40), watchLinks, 640);
  const horrorItems = applyWatchLinks(mapItems(horror, 'movie', 700, 40), watchLinks, 700);
  const comedyItems = applyWatchLinks(mapItems(comedy, 'movie', 760, 40), watchLinks, 760);
  const sciFiItems = applyWatchLinks(mapItems(sciFi, 'movie', 820, 40), watchLinks, 820);
  const romanceItems = applyWatchLinks(mapItems(romance, 'movie', 880, 40), watchLinks, 880);
  const fantasyItems = applyWatchLinks(mapItems(fantasy, 'movie', 940, 40), watchLinks, 940);
  const documentaryItems = applyWatchLinks(mapItems(documentary, 'movie', 1000, 40), watchLinks, 1000);

  const heroItems = uniqueItems([...nowItems, ...popularItems, ...upcomingItems, ...topItems]).filter((item) => item.backdropUrl).slice(0, 12);
  const linkedItems = uniqueItems([
    ...topItems,
    ...nowItems,
    ...popularItems,
    ...upcomingItems,
    ...actionItems,
    ...thaiItems,
    ...tvItems,
  ]).filter((item) => item.isWatchReady && item.watchUrl);

  return {
    source: 'tmdb',
    hero: heroItems[0] || nowItems[0] || popularItems[0] || fallback.hero,
    heroItems: heroItems.length ? heroItems : fallback.heroItems,
    sections: [
      {
        slug: 'watch-ready',
        eyebrow: 'พร้อมรับชม',
        title: 'แนะนำสำหรับคุณ',
        description: 'คัดเรื่องที่มีลิงก์รับชมจากระบบของคุณ โดยใช้ข้อมูลหนังจาก TMDB',
        items: linkedItems.length ? linkedItems : popularItems,
      },
      {
        slug: 'now-playing',
        eyebrow: 'มาใหม่',
        title: 'ภาพยนตร์มาใหม่',
        description: 'แถวภาพยนตร์ใหม่สำหรับสร้างความรู้สึกสดและมีชีวิต',
        items: nowItems,
      },
      {
        slug: 'popular',
        eyebrow: 'กำลังนิยม',
        title: 'ยอดนิยมตอนนี้',
        description: 'หนังที่คนค้นหาและมีแนวโน้มคลิกสูง',
        items: popularItems,
      },
      {
        slug: 'top-rated',
        eyebrow: 'คะแนนสูง',
        title: 'คะแนนสูงน่าดู',
        description: 'รวมหนังคะแนนดีสำหรับคนเลือกจากคุณภาพ',
        items: topItems,
      },
      {
        slug: 'upcoming',
        eyebrow: 'กำลังเข้าใหม่',
        title: 'เร็ว ๆ นี้',
        description: 'หนังใหม่ที่เหมาะสำหรับทำแถวรออัปเดต',
        items: upcomingItems,
      },
      {
        slug: 'series',
        eyebrow: 'ซีรีส์',
        title: 'ซีรีส์น่าติดตาม',
        description: 'คอนเทนต์ซีรีส์ที่ต่อยอดหน้า TV detail ได้',
        items: tvItems,
      },
      {
        slug: 'thai',
        eyebrow: 'Local Focus',
        title: 'หนังไทย',
        description: 'หมวดเฉพาะทางสำหรับตลาดไทยและ SEO ภาษาไทย',
        items: thaiItems,
      },
      { slug: 'action', eyebrow: 'Action', title: 'แอ็กชัน', description: 'หนังแอ็กชันสำหรับคนชอบจังหวะเร็ว', items: actionItems },
      { slug: 'drama', eyebrow: 'Drama', title: 'ดราม่า', description: 'ดราม่าที่มีอารมณ์และตัวละครชัด', items: dramaItems },
      { slug: 'thriller', eyebrow: 'Thriller', title: 'ระทึกขวัญ', description: 'หนังลุ้นและเข้มข้น', items: thrillerItems },
      { slug: 'horror', eyebrow: 'Horror', title: 'สยองขวัญ', description: 'หนังสยองที่เหมาะกับโทนมืดของเว็บ', items: horrorItems },
      { slug: 'comedy', eyebrow: 'Comedy', title: 'คอมเมดี้', description: 'หนังดูง่าย เบรกอารมณ์จากโทนเข้ม', items: comedyItems },
      { slug: 'sci-fi', eyebrow: 'Sci-Fi', title: 'ไซไฟ', description: 'หนังโลกอนาคตและจินตนาการ', items: sciFiItems },
      { slug: 'romance', eyebrow: 'Romance', title: 'โรแมนติก', description: 'หนังรักและความสัมพันธ์', items: romanceItems },
      { slug: 'fantasy', eyebrow: 'Fantasy', title: 'แฟนตาซี', description: 'โลกเหนือจริงและการผจญภัย', items: fantasyItems },
      { slug: 'documentary', eyebrow: 'Documentary', title: 'สารคดี', description: 'สารคดีและเรื่องจริง', items: documentaryItems },
    ].filter((section) => section.items.length),
  };
}

function youtubeTrailer(videos: TmdbVideo[] = [], fallbackTitle: string) {
  const video = videos.find((item) => item.site === 'YouTube' && (item.type === 'Trailer' || item.official)) || videos.find((item) => item.site === 'YouTube');
  return video?.key ? `https://www.youtube.com/watch?v=${video.key}` : demoTrailerUrl(fallbackTitle);
}

export async function getDetailPayload(mediaType: MediaType, id: string): Promise<DetailPayload> {
  const numericId = Number(id);
  if (!numericId) {
    const item = fallbackItem(0);
    return { item, cast: [], trailerUrl: item.trailerUrl, recommendations: fallbackSections[0].items, source: 'fallback' };
  }

  const [detail, videos, credits, recommendations, watchLinks] = await Promise.all([
    tmdb(`/${mediaType}/${numericId}?language=th-TH`),
    tmdb(`/${mediaType}/${numericId}/videos?language=th-TH`),
    tmdb(`/${mediaType}/${numericId}/credits?language=th-TH`),
    tmdb(`/${mediaType}/${numericId}/recommendations?language=th-TH&page=1`),
    fetchActiveWatchLinks(),
  ]);

  if (!detail?.id) {
    const item = fallbackItem(numericId % 10, { id: numericId, mediaType });
    return { item, cast: [], trailerUrl: item.trailerUrl, recommendations: fallbackSections[0].items, source: 'fallback' };
  }

  const baseItem = toMovieItem(detail, mediaType, 0);
  const trailerUrl = youtubeTrailer(videos?.results, baseItem.title);
  const item = applyWatchLink({ ...baseItem, trailerUrl }, watchLinks, 0);
  const cast = (credits?.cast || []).slice(0, 8).map((person: TmdbCast) => ({
    id: person.id,
    name: person.name,
    character: person.character,
    profileUrl: person.profile_path ? `${profileBase}${person.profile_path}` : undefined,
  }));
  const recItems = applyWatchLinks(
    (recommendations?.results || []).slice(0, 24).map((rec: TmdbItem, index: number) => toMovieItem(rec, mediaType, index + 1)),
    watchLinks,
    1
  );

  return { item, cast, trailerUrl: item.trailerUrl, recommendations: recItems.length ? recItems : fallbackSections[0].items, source: 'tmdb' };
}

export async function getWatchReadyItems() {
  const home = await getHomePayload();
  return uniqueItems(home.sections.flatMap((section) => section.items)).filter((item) => item.isWatchReady && item.watchUrl);
}

export async function searchMovies(query: string) {
  if (!query.trim()) return [];
  const [movie, tv, watchLinks] = await Promise.all([
    tmdbCollection(`/search/movie?language=th-TH&query=${encodeURIComponent(query)}&include_adult=false`, 3),
    tmdbCollection(`/search/tv?language=th-TH&query=${encodeURIComponent(query)}&include_adult=false`, 3),
    fetchActiveWatchLinks(),
  ]);

  const items = [
    ...(movie?.results || []).slice(0, 60).map((item: TmdbItem, index: number) => toMovieItem(item, 'movie', index)),
    ...(tv?.results || []).slice(0, 60).map((item: TmdbItem, index: number) => toMovieItem(item, 'tv', index + 80)),
  ];

  const linkedItems = applyWatchLinks(items, watchLinks);
  return linkedItems.length ? linkedItems : fallbackSections[0].items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
}
