import { supabaseRest, supabaseRestCount } from '@/lib/supabase-rest';

export type SyncMediaType = 'movie' | 'tv' | 'both';
export type SyncStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'preview';

export type SyncFilters = {
  mediaType: SyncMediaType;
  yearFrom: number | null;
  yearTo: number | null;
  voteAverageMin: number;
  voteCountMin: number;
  language: string;
  region: string;
  genre: string;
  provider: string;
  company: string;
  collection: string;
  sortBy: string;
  maxItems: number;
  batchSize: number;
};

export type SyncSafetyOptions = {
  dryRun: boolean;
  keepMovieLinks: boolean;
  keepFavoritesHistory: boolean;
  keepAnalytics: boolean;
  archiveExistingCatalog: boolean;
  refreshMetadataOnly: boolean;
  syncMissingMetadataOnly: boolean;
  syncNewTitlesOnly: boolean;
  rebuildSections: boolean;
  clearImportedRows: boolean;
};

export type SyncProfile = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  mediaType: SyncMediaType;
  kind: 'list' | 'trending' | 'discover' | 'provider' | 'company' | 'language' | 'genre';
  endpoint?: string;
  timeWindow?: 'day' | 'week';
  providerQuery?: string;
  companyQuery?: string;
  language?: string;
  genreId?: number;
  genreIds?: number[];
  sortBy?: string;
  sourceBucket: string;
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
  popularity?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  original_language?: string;
  adult?: boolean;
};

type TmdbResponse = {
  page?: number;
  total_pages?: number;
  total_results?: number;
  results?: TmdbItem[];
};

type TmdbProvider = {
  provider_id: number;
  provider_name: string;
};

type TmdbCompany = {
  id: number;
  name: string;
};

type TmdbCompanyResponse = {
  results?: TmdbCompany[];
};

type SyncJobRow = {
  id: string;
  job_type: string;
  profile_id: string;
  profile_label: string;
  status: SyncStatus;
  dry_run: boolean;
  target_count: number;
  batch_size: number;
  current_page: number;
  processed_count: number;
  inserted_count: number;
  updated_count: number;
  skipped_count: number;
  error_count: number;
  filters: SyncFilters;
  safety_options: SyncSafetyOptions;
  preview: Record<string, unknown> | null;
  last_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export type SyncJobSummary = SyncJobRow & {
  logs?: SyncJobLog[];
};

export type SyncJobLog = {
  id: string;
  job_id: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type CatalogRow = ReturnType<typeof rowFromTmdbItem>;

const imageBase = 'https://image.tmdb.org/t/p/original';
const posterBase = 'https://image.tmdb.org/t/p/w500';
const maxPreviewTarget = 10000;
const defaultBatchSize = 100;
const maxPagesPerBatch = 10;

export const syncProfiles: SyncProfile[] = [
  { id: 'popular-movies', label: 'Popular Movies', shortLabel: 'Popular', description: 'หนังยอดนิยมจาก TMDB', mediaType: 'movie', kind: 'list', endpoint: '/movie/popular', sourceBucket: 'popular' },
  { id: 'top-rated-movies', label: 'Top Rated Movies', shortLabel: 'Top Rated', description: 'หนังคะแนนสูง', mediaType: 'movie', kind: 'list', endpoint: '/movie/top_rated', sourceBucket: 'top-rated' },
  { id: 'trending-movies-daily', label: 'Trending Movies Daily', shortLabel: 'Trending D', description: 'หนังที่กำลังมาแรงรายวัน', mediaType: 'movie', kind: 'trending', timeWindow: 'day', sourceBucket: 'trending' },
  { id: 'trending-movies-weekly', label: 'Trending Movies Weekly', shortLabel: 'Trending W', description: 'หนังที่กำลังมาแรงรายสัปดาห์', mediaType: 'movie', kind: 'trending', timeWindow: 'week', sourceBucket: 'trending' },
  { id: 'now-playing', label: 'Now Playing', shortLabel: 'Now Playing', description: 'หนังที่กำลังฉาย', mediaType: 'movie', kind: 'list', endpoint: '/movie/now_playing', sourceBucket: 'new-release' },
  { id: 'upcoming', label: 'Upcoming', shortLabel: 'Upcoming', description: 'หนังใกล้เข้าฉาย', mediaType: 'movie', kind: 'list', endpoint: '/movie/upcoming', sourceBucket: 'coming-soon' },
  { id: 'popular-series', label: 'Popular Series', shortLabel: 'Series', description: 'ซีรีส์ยอดนิยม', mediaType: 'tv', kind: 'list', endpoint: '/tv/popular', sourceBucket: 'series' },
  { id: 'top-rated-series', label: 'Top Rated Series', shortLabel: 'Top Series', description: 'ซีรีส์คะแนนสูง', mediaType: 'tv', kind: 'list', endpoint: '/tv/top_rated', sourceBucket: 'top-rated' },
  { id: 'trending-series', label: 'Trending Series', shortLabel: 'Trend TV', description: 'ซีรีส์ที่กำลังมาแรง', mediaType: 'tv', kind: 'trending', timeWindow: 'week', sourceBucket: 'trending' },
  { id: 'airing-today', label: 'Airing Today', shortLabel: 'Airing', description: 'ซีรีส์ที่ออกอากาศวันนี้', mediaType: 'tv', kind: 'list', endpoint: '/tv/airing_today', sourceBucket: 'series' },
  { id: 'on-the-air', label: 'On The Air', shortLabel: 'On Air', description: 'ซีรีส์ที่ยังออกอากาศอยู่', mediaType: 'tv', kind: 'list', endpoint: '/tv/on_the_air', sourceBucket: 'series' },
  { id: 'netflix-style', label: 'Netflix Style', shortLabel: 'Netflix', description: 'Resolve provider จากชื่อ Netflix ไม่ hardcode ID', mediaType: 'both', kind: 'provider', providerQuery: 'Netflix', sourceBucket: 'netflix' },
  { id: 'apple-tv-style', label: 'Apple TV Style', shortLabel: 'Apple', description: 'Resolve provider จากชื่อ Apple TV', mediaType: 'both', kind: 'provider', providerQuery: 'Apple TV', sourceBucket: 'apple' },
  { id: 'disney-style', label: 'Disney Style', shortLabel: 'Disney', description: 'Resolve provider จากชื่อ Disney Plus', mediaType: 'both', kind: 'provider', providerQuery: 'Disney', sourceBucket: 'disney' },
  { id: 'marvel', label: 'Marvel', shortLabel: 'Marvel', description: 'Resolve company จากชื่อ Marvel Studios', mediaType: 'movie', kind: 'company', companyQuery: 'Marvel Studios', sourceBucket: 'marvel' },
  { id: 'dc', label: 'DC', shortLabel: 'DC', description: 'Resolve company จากชื่อ DC', mediaType: 'movie', kind: 'company', companyQuery: 'DC Entertainment', sourceBucket: 'dc' },
  { id: 'hbo-max', label: 'HBO / Max', shortLabel: 'HBO', description: 'Resolve provider จากชื่อ HBO / Max', mediaType: 'both', kind: 'provider', providerQuery: 'Max', sourceBucket: 'hbo' },
  { id: 'prime-video', label: 'Prime Video', shortLabel: 'Prime', description: 'Resolve provider จากชื่อ Prime Video', mediaType: 'both', kind: 'provider', providerQuery: 'Amazon Prime Video', sourceBucket: 'prime' },
  { id: 'animation', label: 'Animation', shortLabel: 'Animation', description: 'แอนิเมชัน', mediaType: 'both', kind: 'genre', genreId: 16, sourceBucket: 'animation' },
  { id: 'anime', label: 'Anime', shortLabel: 'Anime', description: 'อนิเมะญี่ปุ่น', mediaType: 'both', kind: 'language', language: 'ja', genreId: 16, sourceBucket: 'anime' },
  { id: 'korean-drama', label: 'Korean Drama', shortLabel: 'Korea', description: 'คอนเทนต์เกาหลี', mediaType: 'both', kind: 'language', language: 'ko', sourceBucket: 'korea' },
  { id: 'thai-content', label: 'Thai Content', shortLabel: 'Thai', description: 'หนังและซีรีส์ไทย', mediaType: 'both', kind: 'language', language: 'th', sourceBucket: 'thai' },
  { id: 'japanese', label: 'Japanese', shortLabel: 'Japan', description: 'คอนเทนต์ญี่ปุ่น', mediaType: 'both', kind: 'language', language: 'ja', sourceBucket: 'japan' },
  { id: 'chinese', label: 'Chinese', shortLabel: 'China', description: 'คอนเทนต์จีน', mediaType: 'both', kind: 'language', language: 'zh', sourceBucket: 'china' },
  { id: 'indian', label: 'Indian', shortLabel: 'Indian', description: 'คอนเทนต์อินเดีย', mediaType: 'both', kind: 'language', language: 'hi', sourceBucket: 'indian' },
  { id: 'spanish', label: 'Spanish', shortLabel: 'Spanish', description: 'คอนเทนต์ภาษาสเปน', mediaType: 'both', kind: 'language', language: 'es', sourceBucket: 'spanish' },
  { id: 'family-kids', label: 'Family / Kids', shortLabel: 'Family', description: 'ครอบครัวและเด็ก', mediaType: 'both', kind: 'genre', genreIds: [10751, 16], sourceBucket: 'family' },
  { id: 'documentary', label: 'Documentary', shortLabel: 'Doc', description: 'สารคดี', mediaType: 'both', kind: 'genre', genreId: 99, sourceBucket: 'documentary' },
  { id: 'horror', label: 'Horror', shortLabel: 'Horror', description: 'สยองขวัญ', mediaType: 'movie', kind: 'genre', genreId: 27, sourceBucket: 'horror' },
  { id: 'action', label: 'Action', shortLabel: 'Action', description: 'แอ็กชัน', mediaType: 'movie', kind: 'genre', genreId: 28, sourceBucket: 'action' },
  { id: 'comedy', label: 'Comedy', shortLabel: 'Comedy', description: 'คอมเมดี้', mediaType: 'both', kind: 'genre', genreId: 35, sourceBucket: 'comedy' },
  { id: 'romance', label: 'Romance', shortLabel: 'Romance', description: 'โรแมนติก', mediaType: 'both', kind: 'genre', genreId: 10749, sourceBucket: 'romance' },
  { id: 'sci-fi-fantasy', label: 'Sci-Fi / Fantasy', shortLabel: 'Sci-Fi', description: 'ไซไฟและแฟนตาซี', mediaType: 'movie', kind: 'genre', genreIds: [878, 14], sourceBucket: 'sci-fi' },
  { id: 'crime-thriller', label: 'Crime / Thriller', shortLabel: 'Crime', description: 'อาชญากรรมและระทึกขวัญ', mediaType: 'both', kind: 'genre', genreIds: [80, 53], sourceBucket: 'crime' },
];

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

export const defaultSyncFilters: SyncFilters = {
  mediaType: 'both',
  yearFrom: null,
  yearTo: null,
  voteAverageMin: 5,
  voteCountMin: 20,
  language: '',
  region: 'TH',
  genre: '',
  provider: '',
  company: '',
  collection: '',
  sortBy: 'popularity.desc',
  maxItems: 10000,
  batchSize: defaultBatchSize,
};

export const defaultSafetyOptions: SyncSafetyOptions = {
  dryRun: true,
  keepMovieLinks: true,
  keepFavoritesHistory: true,
  keepAnalytics: true,
  archiveExistingCatalog: false,
  refreshMetadataOnly: false,
  syncMissingMetadataOnly: false,
  syncNewTitlesOnly: true,
  rebuildSections: false,
  clearImportedRows: false,
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function cleanYear(value: unknown) {
  const year = Number(value);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return null;
  return Math.round(year);
}

export function normalizeSyncFilters(input: Partial<SyncFilters> | undefined): SyncFilters {
  const mediaType = input?.mediaType === 'movie' || input?.mediaType === 'tv' || input?.mediaType === 'both' ? input.mediaType : defaultSyncFilters.mediaType;
  return {
    mediaType,
    yearFrom: cleanYear(input?.yearFrom),
    yearTo: cleanYear(input?.yearTo),
    voteAverageMin: clamp(Number(input?.voteAverageMin ?? defaultSyncFilters.voteAverageMin), 0, 10),
    voteCountMin: clamp(Number(input?.voteCountMin ?? defaultSyncFilters.voteCountMin), 0, 100000),
    language: cleanText(input?.language),
    region: cleanText(input?.region, defaultSyncFilters.region).slice(0, 8).toUpperCase(),
    genre: cleanText(input?.genre),
    provider: cleanText(input?.provider),
    company: cleanText(input?.company),
    collection: cleanText(input?.collection),
    sortBy: cleanText(input?.sortBy, defaultSyncFilters.sortBy) || defaultSyncFilters.sortBy,
    maxItems: clamp(Number(input?.maxItems ?? defaultSyncFilters.maxItems), 1, maxPreviewTarget),
    batchSize: clamp(Number(input?.batchSize ?? defaultSyncFilters.batchSize), 20, 250),
  };
}

export function normalizeSafetyOptions(input: Partial<SyncSafetyOptions> | undefined): SyncSafetyOptions {
  return {
    ...defaultSafetyOptions,
    ...input,
    keepMovieLinks: input?.keepMovieLinks !== false,
    keepFavoritesHistory: input?.keepFavoritesHistory !== false,
    keepAnalytics: input?.keepAnalytics !== false,
    dryRun: input?.dryRun !== false,
  };
}

export function getSyncProfile(profileId?: string) {
  return syncProfiles.find((profile) => profile.id === profileId) || syncProfiles[0];
}

async function tmdb<T>(path: string): Promise<T> {
  const token = process.env.TMDB_ACCESS_TOKEN?.trim();
  if (!token) throw new Error('Missing TMDB_ACCESS_TOKEN');

  const response = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `TMDB request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function resolveProviderId(profile: SyncProfile, mediaType: 'movie' | 'tv', region: string) {
  const providerQuery = (profile.providerQuery || '').toLowerCase();
  if (!providerQuery) return null;
  const data = await tmdb<{ results?: TmdbProvider[] }>(`/watch/providers/${mediaType}?watch_region=${encodeURIComponent(region || 'TH')}`);
  const providers = data.results || [];
  const exact = providers.find((provider) => provider.provider_name.toLowerCase() === providerQuery);
  const partial = providers.find((provider) => provider.provider_name.toLowerCase().includes(providerQuery) || providerQuery.includes(provider.provider_name.toLowerCase()));
  return (exact || partial)?.provider_id || null;
}

async function resolveCompanyId(profile: SyncProfile) {
  const companyQuery = profile.companyQuery || '';
  if (!companyQuery) return null;
  const data = await tmdb<TmdbCompanyResponse>(`/search/company?query=${encodeURIComponent(companyQuery)}`);
  const companies = data.results || [];
  const exact = companies.find((company) => company.name.toLowerCase() === companyQuery.toLowerCase());
  const partial = companies.find((company) => company.name.toLowerCase().includes(companyQuery.toLowerCase()));
  return (exact || partial || companies[0])?.id || null;
}

function selectedMediaTypes(profile: SyncProfile, filters: SyncFilters): Array<'movie' | 'tv'> {
  const mediaType = profile.mediaType === 'both' ? filters.mediaType : profile.mediaType;
  if (mediaType === 'movie') return ['movie'];
  if (mediaType === 'tv') return ['tv'];
  return ['movie', 'tv'];
}

function addQuery(path: string, params: Record<string, string | number | null | undefined>) {
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    urlParams.set(key, String(value));
  }
  const query = urlParams.toString();
  if (!query) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${query}`;
}

function dateParams(mediaType: 'movie' | 'tv', filters: SyncFilters) {
  const yearFrom = filters.yearFrom;
  const yearTo = filters.yearTo;
  if (!yearFrom && !yearTo) return {};
  const minDate = yearFrom ? `${yearFrom}-01-01` : undefined;
  const maxDate = yearTo ? `${yearTo}-12-31` : undefined;
  if (mediaType === 'movie') {
    return {
      'primary_release_date.gte': minDate,
      'primary_release_date.lte': maxDate,
    };
  }
  return {
    'first_air_date.gte': minDate,
    'first_air_date.lte': maxDate,
  };
}

async function buildDiscoverPath(profile: SyncProfile, mediaType: 'movie' | 'tv', filters: SyncFilters, page: number) {
  const params: Record<string, string | number | null | undefined> = {
    language: 'th-TH',
    region: filters.region || 'TH',
    sort_by: profile.sortBy || filters.sortBy || 'popularity.desc',
    include_adult: 'false',
    page,
    'vote_average.gte': filters.voteAverageMin,
    'vote_count.gte': filters.voteCountMin,
    ...dateParams(mediaType, filters),
  };

  const genreIds = profile.genreIds || (profile.genreId ? [profile.genreId] : []);
  const genre = filters.genre || genreIds.join('|');
  if (genre) params.with_genres = genre;
  if (profile.language || filters.language) params.with_original_language = profile.language || filters.language;
  if (filters.collection && mediaType === 'movie') params.with_collection = filters.collection;

  if (profile.kind === 'provider' || filters.provider) {
    const providerId = filters.provider || (await resolveProviderId(profile, mediaType, filters.region || 'TH'));
    if (providerId) {
      params.with_watch_providers = providerId;
      params.watch_region = filters.region || 'TH';
    }
  }

  if (profile.kind === 'company' || filters.company) {
    const companyId = filters.company || (await resolveCompanyId(profile));
    if (companyId) params.with_companies = companyId;
  }

  return addQuery(`/discover/${mediaType}`, params);
}

async function buildTmdbPath(profile: SyncProfile, mediaType: 'movie' | 'tv', filters: SyncFilters, page: number) {
  if (profile.kind === 'trending') {
    return addQuery(`/trending/${mediaType}/${profile.timeWindow || 'week'}`, { language: 'th-TH', page });
  }

  if (profile.kind === 'list' && profile.endpoint) {
    return addQuery(profile.endpoint, {
      language: 'th-TH',
      region: filters.region || 'TH',
      page,
    });
  }

  return buildDiscoverPath(profile, mediaType, filters, page);
}

function titleOf(item: TmdbItem) {
  return item.title || item.name || item.original_title || item.original_name || `TMDB ${item.id}`;
}

function releaseDateOf(item: TmdbItem) {
  return item.release_date || item.first_air_date || null;
}

function qualified(item: TmdbItem, filters: SyncFilters) {
  const rating = Number(item.vote_average || 0);
  const voteCount = Number(item.vote_count || 0);
  const hasTitle = Boolean(titleOf(item));
  const hasImage = Boolean(item.poster_path || item.backdrop_path);
  return hasTitle && hasImage && !item.adult && rating >= filters.voteAverageMin && voteCount >= filters.voteCountMin;
}

function rowFromTmdbItem(item: TmdbItem, mediaType: 'movie' | 'tv', profile: SyncProfile) {
  const rating = Number(item.vote_average || 0);
  const voteCount = Number(item.vote_count || 0);
  const popularity = Number(item.popularity || 0);
  const releaseDate = releaseDateOf(item);
  const genreIds = item.genre_ids || [];

  return {
    tmdb_id: item.id,
    media_type: mediaType,
    title: titleOf(item),
    title_en: item.original_title || item.original_name || item.title || item.name || null,
    overview: item.overview || null,
    poster_url: item.poster_path ? `${posterBase}${item.poster_path}` : null,
    backdrop_url: item.backdrop_path ? `${imageBase}${item.backdrop_path}` : null,
    rating,
    vote_count: voteCount,
    popularity,
    release_year: releaseDate ? releaseDate.slice(0, 4) : null,
    release_date: releaseDate,
    genres: genreIds.map((id) => genreNames[id] || 'ภาพยนตร์'),
    genre_ids: genreIds,
    language: item.original_language || null,
    country_bucket: item.original_language || null,
    source_bucket: profile.sourceBucket,
    sort_score: rating * 100000 + Math.min(voteCount, 20000) + popularity,
    is_active: true,
    raw: item,
    synced_at: new Date().toISOString(),
  };
}

async function countRows(path: string) {
  try {
    return { value: await supabaseRestCount(path, { mode: 'service', cache: 'no-store' }), ready: true as const };
  } catch (error) {
    return { value: 0, ready: false as const, error: error instanceof Error ? error.message : 'not available' };
  }
}

async function getRows<T>(path: string) {
  try {
    return { rows: await supabaseRest<T[]>(path, { mode: 'service', cache: 'no-store' }), ready: true as const };
  } catch (error) {
    return { rows: [] as T[], ready: false as const, error: error instanceof Error ? error.message : 'not available' };
  }
}

export async function getCatalogSyncStatus() {
  const since7d = new Date();
  since7d.setDate(since7d.getDate() - 7);
  const since7dIso = since7d.toISOString();

  const [
    totalCatalog,
    movies,
    series,
    readyLinks,
    brokenLinks,
    rating5,
    rating7,
    rating8,
    missingPoster,
    missingBackdrop,
    users,
    favorites,
    watchHistory,
    memberships,
    premiumMembers,
    reports,
    analyticsEvents,
    pageViews,
    watchClicks,
    searches,
    latestSynced,
    jobs,
    logs,
  ] = await Promise.all([
    countRows('tmdb_catalog?select=tmdb_id'),
    countRows('tmdb_catalog?media_type=eq.movie&select=tmdb_id'),
    countRows('tmdb_catalog?media_type=eq.tv&select=tmdb_id'),
    countRows('admin_movie_links?watch_url=not.is.null&select=tmdb_id'),
    countRows('admin_movie_links?status=eq.broken&select=tmdb_id'),
    countRows('tmdb_catalog?rating=gte.5&select=tmdb_id'),
    countRows('tmdb_catalog?rating=gte.7&select=tmdb_id'),
    countRows('tmdb_catalog?rating=gte.8&select=tmdb_id'),
    countRows('tmdb_catalog?poster_url=is.null&select=tmdb_id'),
    countRows('tmdb_catalog?backdrop_url=is.null&select=tmdb_id'),
    countRows('profiles?select=id'),
    countRows('favorites?select=id'),
    countRows('watch_history?select=id'),
    countRows('memberships?select=id'),
    countRows('memberships?status=eq.active&select=id'),
    countRows('link_reports?select=id'),
    countRows(`analytics_events?created_at=gte.${encodeURIComponent(since7dIso)}&select=id`),
    countRows(`analytics_events?event_name=eq.page_view&created_at=gte.${encodeURIComponent(since7dIso)}&select=id`),
    countRows(`analytics_events?event_name=eq.watch_click&created_at=gte.${encodeURIComponent(since7dIso)}&select=id`),
    countRows(`analytics_events?event_name=eq.search&created_at=gte.${encodeURIComponent(since7dIso)}&select=id`),
    getRows<{ synced_at?: string | null; updated_at?: string | null }>('tmdb_catalog?select=synced_at,updated_at&order=synced_at.desc.nullslast&limit=1'),
    getRows<SyncJobRow>('admin_sync_jobs?select=*&order=updated_at.desc&limit=12'),
    getRows<SyncJobLog>('admin_sync_job_logs?select=*&order=created_at.desc&limit=20'),
  ]);

  const missingLinks = Math.max(totalCatalog.value - readyLinks.value, 0);
  const latestRow = latestSynced.rows[0];

  return {
    generatedAt: new Date().toISOString(),
    catalog: {
      total: totalCatalog.value,
      movies: movies.value,
      series: series.value,
      readyLinks: readyLinks.value,
      missingLinks,
      brokenLinks: brokenLinks.value,
      rating5: rating5.value,
      rating7: rating7.value,
      rating8: rating8.value,
      missingPoster: missingPoster.value,
      missingBackdrop: missingBackdrop.value,
      latestSyncedAt: latestRow?.synced_at || latestRow?.updated_at || null,
    },
    dashboard: {
      users: users.value,
      favorites: favorites.value,
      watchHistory: watchHistory.value,
      memberships: memberships.value,
      premiumMembers: premiumMembers.value,
      reports: reports.value,
      analyticsEvents7d: analyticsEvents.value,
      pageViews7d: pageViews.value,
      watchClicks7d: watchClicks.value,
      searches7d: searches.value,
      topContentStatus: analyticsEvents.ready ? 'ready' : 'setup_needed',
      topSearchesStatus: analyticsEvents.ready ? 'ready' : 'setup_needed',
    },
    dataSources: [
      { key: 'tmdb_catalog', label: 'Catalog', ready: totalCatalog.ready, value: totalCatalog.value, error: totalCatalog.error },
      { key: 'admin_movie_links', label: 'Watch links', ready: readyLinks.ready, value: readyLinks.value, error: readyLinks.error },
      { key: 'profiles', label: 'Users', ready: users.ready, value: users.value, error: users.error },
      { key: 'favorites', label: 'Favorites', ready: favorites.ready, value: favorites.value, error: favorites.error },
      { key: 'watch_history', label: 'Watch history', ready: watchHistory.ready, value: watchHistory.value, error: watchHistory.error },
      { key: 'memberships', label: 'Memberships', ready: memberships.ready, value: memberships.value, error: memberships.error },
      { key: 'link_reports', label: 'Reports', ready: reports.ready, value: reports.value, error: reports.error },
      { key: 'analytics_events', label: 'Analytics events', ready: analyticsEvents.ready, value: analyticsEvents.value, error: analyticsEvents.error },
      { key: 'admin_sync_jobs', label: 'Sync jobs', ready: jobs.ready, value: jobs.rows.length, error: jobs.error },
    ],
    profiles: syncProfiles,
    jobs: jobs.rows,
    logs: logs.rows,
  };
}

export function buildPreview(profile: SyncProfile, filters: SyncFilters, safety: SyncSafetyOptions) {
  const mediaTypes = selectedMediaTypes(profile, filters);
  const estimatedPages = Math.ceil(filters.maxItems / 20);
  const estimatedBatches = Math.ceil(filters.maxItems / filters.batchSize);
  return {
    profileId: profile.id,
    profileLabel: profile.label,
    mediaTypes,
    targetCount: filters.maxItems,
    batchSize: filters.batchSize,
    estimatedPages,
    estimatedBatches,
    voteAverageMin: filters.voteAverageMin,
    destructiveActions: [],
    preservedData: {
      movieLinks: safety.keepMovieLinks,
      userFavoritesHistory: safety.keepFavoritesHistory,
      analytics: safety.keepAnalytics,
      memberships: true,
    },
    estimated: {
      insert: 'ตรวจจริงตอน Start/Resume',
      update: 'ตรวจจริงตอน Start/Resume',
      skip: 'กรอง adult / ไม่มีรูป / คะแนนต่ำกว่าเงื่อนไข',
    },
    dryRun: safety.dryRun,
    note: 'Preview ไม่เขียนข้อมูล catalog จริง และไม่ลบ user/favorites/history/memberships/analytics',
  };
}

export async function createPreview(profileId: string, filtersInput?: Partial<SyncFilters>, safetyInput?: Partial<SyncSafetyOptions>) {
  const profile = getSyncProfile(profileId);
  const filters = normalizeSyncFilters(filtersInput);
  const safety = normalizeSafetyOptions(safetyInput);
  return buildPreview(profile, filters, safety);
}

async function insertJobLog(jobId: string, level: SyncJobLog['level'], message: string, metadata: Record<string, unknown> = {}) {
  await supabaseRest('admin_sync_job_logs', {
    method: 'POST',
    mode: 'service',
    prefer: 'return=minimal',
    body: [{ job_id: jobId, level, message, metadata }],
  });
}

async function patchJob(jobId: string, body: Partial<SyncJobRow>) {
  await supabaseRest(`admin_sync_jobs?id=eq.${encodeURIComponent(jobId)}`, {
    method: 'PATCH',
    mode: 'service',
    prefer: 'return=minimal',
    body: { ...body, updated_at: new Date().toISOString() },
  });
}

async function createJob(profile: SyncProfile, filters: SyncFilters, safety: SyncSafetyOptions, actorId?: string | null) {
  const preview = buildPreview(profile, filters, safety);
  const rows = await supabaseRest<SyncJobRow[]>('admin_sync_jobs?select=*', {
    method: 'POST',
    mode: 'service',
    prefer: 'return=representation',
    body: [{
      job_type: 'catalog_refresh',
      profile_id: profile.id,
      profile_label: profile.label,
      status: 'running',
      dry_run: safety.dryRun,
      target_count: filters.maxItems,
      batch_size: filters.batchSize,
      current_page: 1,
      filters,
      safety_options: safety,
      preview,
      created_by: actorId || null,
      started_at: new Date().toISOString(),
    }],
  });
  const job = rows[0];
  if (!job) throw new Error('Cannot create sync job');
  await insertJobLog(job.id, 'info', safety.dryRun ? 'Created dry-run sync job' : 'Created sync job', { profile: profile.id, targetCount: filters.maxItems });
  return job;
}

async function existingCatalogKeys(rows: CatalogRow[]) {
  const keys = new Set<string>();
  const movieIds = rows.filter((row) => row.media_type === 'movie').map((row) => row.tmdb_id);
  const tvIds = rows.filter((row) => row.media_type === 'tv').map((row) => row.tmdb_id);

  async function load(mediaType: 'movie' | 'tv', ids: number[]) {
    if (!ids.length) return;
    for (let index = 0; index < ids.length; index += 200) {
      const chunk = ids.slice(index, index + 200);
      const found = await supabaseRest<Array<{ tmdb_id: number; media_type: 'movie' | 'tv' }>>(
        `tmdb_catalog?media_type=eq.${mediaType}&tmdb_id=in.(${chunk.join(',')})&select=tmdb_id,media_type&limit=200`,
        { mode: 'service', cache: 'no-store' },
      );
      for (const row of found || []) keys.add(`${row.media_type}-${row.tmdb_id}`);
    }
  }

  await Promise.all([load('movie', movieIds), load('tv', tvIds)]);
  return keys;
}

async function upsertCatalogRows(rows: CatalogRow[]) {
  if (!rows.length) return;
  for (let index = 0; index < rows.length; index += 200) {
    const chunk = rows.slice(index, index + 200);
    await supabaseRest('tmdb_catalog?on_conflict=tmdb_id,media_type', {
      method: 'POST',
      mode: 'service',
      body: chunk,
      prefer: 'resolution=merge-duplicates,return=minimal',
    });
  }
}

async function collectBatch(profile: SyncProfile, filters: SyncFilters, startPage: number) {
  const mediaTypes = selectedMediaTypes(profile, filters);
  const pagesToFetch = Math.min(maxPagesPerBatch, Math.max(1, Math.ceil(filters.batchSize / 20)));
  const collected = new Map<string, CatalogRow>();
  let skipped = 0;
  let fetched = 0;
  let maxTotalPages = startPage;

  for (const mediaType of mediaTypes) {
    for (let page = startPage; page < startPage + pagesToFetch; page += 1) {
      const path = await buildTmdbPath(profile, mediaType, filters, page);
      const data = await tmdb<TmdbResponse>(path);
      maxTotalPages = Math.max(maxTotalPages, Number(data.total_pages || page));
      for (const item of data.results || []) {
        fetched += 1;
        if (!qualified(item, filters)) {
          skipped += 1;
          continue;
        }
        const row = rowFromTmdbItem(item, mediaType, profile);
        collected.set(`${row.media_type}-${row.tmdb_id}`, row);
      }
    }
  }

  const rows = [...collected.values()]
    .sort((a, b) => Number(b.sort_score || 0) - Number(a.sort_score || 0))
    .slice(0, filters.batchSize);

  return {
    rows,
    skipped,
    fetched,
    pagesFetched: pagesToFetch,
    nextPage: startPage + pagesToFetch,
    totalPages: maxTotalPages,
  };
}

async function runJobBatch(job: SyncJobRow) {
  const profile = getSyncProfile(job.profile_id);
  const filters = normalizeSyncFilters(job.filters);
  const safety = normalizeSafetyOptions(job.safety_options);
  const batch = await collectBatch(profile, filters, Math.max(1, Number(job.current_page || 1)));
  const existing = await existingCatalogKeys(batch.rows);
  const inserted = batch.rows.filter((row) => !existing.has(`${row.media_type}-${row.tmdb_id}`)).length;
  const updated = batch.rows.length - inserted;
  const nextProcessed = Math.min(job.target_count, Number(job.processed_count || 0) + batch.rows.length);
  const completed = nextProcessed >= job.target_count || batch.nextPage > batch.totalPages || batch.rows.length === 0;
  const nextStatus: SyncStatus = completed ? 'completed' : 'paused';

  if (!safety.dryRun) {
    await upsertCatalogRows(batch.rows);
  }

  await patchJob(job.id, {
    status: nextStatus,
    current_page: batch.nextPage,
    processed_count: nextProcessed,
    inserted_count: Number(job.inserted_count || 0) + (safety.dryRun ? 0 : inserted),
    updated_count: Number(job.updated_count || 0) + (safety.dryRun ? 0 : updated),
    skipped_count: Number(job.skipped_count || 0) + batch.skipped,
    completed_at: completed ? new Date().toISOString() : null,
  });

  await insertJobLog(job.id, safety.dryRun ? 'info' : 'success', safety.dryRun ? 'Dry run batch completed without catalog writes' : 'Batch synced and catalog upserted', {
    profile: profile.id,
    fetched: batch.fetched,
    qualified: batch.rows.length,
    insertedEstimate: inserted,
    updatedEstimate: updated,
    skipped: batch.skipped,
    nextPage: batch.nextPage,
    status: nextStatus,
  });

  return {
    status: nextStatus,
    processed: nextProcessed,
    fetched: batch.fetched,
    qualified: batch.rows.length,
    insertedEstimate: inserted,
    updatedEstimate: updated,
    skipped: batch.skipped,
    nextPage: batch.nextPage,
    completed,
    dryRun: safety.dryRun,
  };
}

export async function startSyncJob(profileId: string, filtersInput?: Partial<SyncFilters>, safetyInput?: Partial<SyncSafetyOptions>, actorId?: string | null) {
  const profile = getSyncProfile(profileId);
  const filters = normalizeSyncFilters(filtersInput);
  const safety = normalizeSafetyOptions(safetyInput);
  const job = await createJob(profile, filters, safety, actorId);

  try {
    const result = await runJobBatch(job);
    return { jobId: job.id, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync job failed';
    await patchJob(job.id, {
      status: 'failed',
      last_error: message,
      error_count: Number(job.error_count || 0) + 1,
      completed_at: new Date().toISOString(),
    });
    await insertJobLog(job.id, 'error', message, { profile: profile.id });
    throw error;
  }
}

export async function listSyncJobs(limit = 20) {
  const jobs = await supabaseRest<SyncJobRow[]>(`admin_sync_jobs?select=*&order=updated_at.desc&limit=${Math.min(Math.max(limit, 1), 50)}`, {
    mode: 'service',
    cache: 'no-store',
  });
  return jobs || [];
}

export async function getSyncJob(jobId: string): Promise<SyncJobSummary | null> {
  const rows = await supabaseRest<SyncJobRow[]>(`admin_sync_jobs?id=eq.${encodeURIComponent(jobId)}&select=*&limit=1`, {
    mode: 'service',
    cache: 'no-store',
  });
  const job = rows[0];
  if (!job) return null;
  const logs = await supabaseRest<SyncJobLog[]>(`admin_sync_job_logs?job_id=eq.${encodeURIComponent(jobId)}&select=*&order=created_at.desc&limit=100`, {
    mode: 'service',
    cache: 'no-store',
  });
  return { ...job, logs: logs || [] };
}

export async function cancelSyncJob(jobId: string) {
  const job = await getSyncJob(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status === 'completed' || job.status === 'cancelled') return job;
  await patchJob(jobId, { status: 'cancelled', completed_at: new Date().toISOString() });
  await insertJobLog(jobId, 'warn', 'Job cancelled by admin');
  return getSyncJob(jobId);
}

export async function resumeSyncJob(jobId: string) {
  const job = await getSyncJob(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status === 'completed' || job.status === 'cancelled') {
    return { jobId, result: { status: job.status, completed: job.status === 'completed' } };
  }

  await patchJob(jobId, { status: 'running', started_at: job.started_at || new Date().toISOString() });
  await insertJobLog(jobId, 'info', 'Resuming next sync batch', { currentPage: job.current_page });

  try {
    const result = await runJobBatch({ ...job, status: 'running' });
    return { jobId, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync job failed';
    await patchJob(jobId, {
      status: 'failed',
      last_error: message,
      error_count: Number(job.error_count || 0) + 1,
      completed_at: new Date().toISOString(),
    });
    await insertJobLog(jobId, 'error', message);
    throw error;
  }
}
