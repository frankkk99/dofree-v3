export type AdminFrontMedia = 'movie' | 'tv';
export type AdminFrontStatus = 'draft' | 'review' | 'published' | 'broken' | 'hidden';

export type AdminFrontItem = {
  id?: string;
  tmdb_id: number;
  media_type: AdminFrontMedia;
  title?: string | null;
  title_th?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  notes?: string | null;
  section_slug?: string;
  status?: AdminFrontStatus;
  is_active?: boolean;
  poster_url?: string | null;
  backdrop_url?: string | null;
  rating?: number;
  year?: string;
  release_date?: string | null;
  language?: string;
  runtime?: number | null;
  genres?: string[];
  source_bucket?: string;
  source_buckets?: string[];
  updated_at?: string;
};

export type AdminFrontOptions = {
  sources: string[];
  sections: string[];
  genres: string[];
  years: string[];
  months: string[];
  languages: string[];
  providers: string[];
  statuses: string[];
  media: string[];
  posters: string[];
};

export type AdminFrontPayload = {
  ok: boolean;
  links?: AdminFrontItem[];
  options?: AdminFrontOptions;
  meta?: {
    hasMore?: boolean;
    matched?: number;
    returned?: number;
    total?: number;
    offset?: number;
    limit?: number;
  };
  error?: string;
};

export type AdminFrontForm = {
  tmdb_id: string;
  media_type: AdminFrontMedia;
  title: string;
  title_th: string;
  section_slug: string;
  source_bucket: string;
  source_buckets: string;
  status: AdminFrontStatus;
  watch_url: string;
  trailer_url: string;
  provider: string;
  notes: string;
  poster_url: string;
  backdrop_url: string;
  rating: string;
  year: string;
  release_date: string;
  language: string;
  genres: string;
};

export type AdminSeriesEpisode = {
  id?: string;
  tmdb_id: number;
  media_type?: 'tv';
  season_number: number;
  episode_number: number;
  episode_title?: string | null;
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  notes?: string | null;
  status?: AdminFrontStatus;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AdminEpisodeForm = {
  season_number: string;
  episode_number: string;
  episode_title: string;
  watch_url: string;
  trailer_url: string;
  provider: string;
  notes: string;
  status: AdminFrontStatus;
};

export type AdminEpisodeDraft = AdminEpisodeForm & {
  draft_key: string;
};

export const adminFrontBatchSize = 36;

export const adminFrontSections = [
  'watch-ready',
  'top-rated',
  'popular',
  'now-playing',
  'series',
  'thai',
  'action',
  'horror',
  'comedy',
  'korea',
  'japan',
  'china',
  'documentary',
];

export const emptyFrontOptions: AdminFrontOptions = {
  sources: ['all'],
  sections: ['all'],
  genres: ['all'],
  years: ['all'],
  months: ['all'],
  languages: ['all'],
  providers: ['all'],
  statuses: ['all', 'missing', 'ready', 'draft', 'review', 'published', 'broken', 'hidden', 'no-trailer', 'has-trailer'],
  media: ['all', 'movie', 'tv'],
  posters: ['with-poster', 'all', 'no-poster'],
};

export function adminFrontItemName(item: AdminFrontItem) {
  return item.title_th || item.title || `TMDB ${item.tmdb_id}`;
}

export function adminFrontStatusLabel(item: Pick<AdminFrontItem, 'watch_url' | 'status' | 'is_active'>) {
  if (item.status === 'hidden' || item.is_active === false) return 'ซ่อน';
  if (item.status === 'broken') return 'ลิงก์เสีย';
  if (item.status === 'review') return 'รอตรวจ';
  if (item.watch_url || item.status === 'published') return 'พร้อมดู';
  return 'ไม่มีลิงก์';
}

export function toAdminFrontForm(item: AdminFrontItem): AdminFrontForm {
  return {
    tmdb_id: String(item.tmdb_id),
    media_type: item.media_type,
    title: item.title || '',
    title_th: item.title_th || item.title || '',
    section_slug: item.section_slug || item.source_bucket || 'watch-ready',
    source_bucket: item.source_bucket || '',
    source_buckets: (item.source_buckets || []).join(', '),
    status: item.watch_url ? 'published' : item.status || 'draft',
    watch_url: item.watch_url || '',
    trailer_url: item.trailer_url || '',
    provider: item.provider || 'admin',
    notes: item.notes || '',
    poster_url: item.poster_url || '',
    backdrop_url: item.backdrop_url || '',
    rating: String(item.rating ?? ''),
    year: item.year || '',
    release_date: item.release_date || '',
    language: item.language || '',
    genres: (item.genres || []).join(', '),
  };
}

export function emptyEpisodeForm(provider = 'admin'): AdminEpisodeForm {
  return {
    season_number: '1',
    episode_number: '1',
    episode_title: '',
    watch_url: '',
    trailer_url: '',
    provider,
    notes: '',
    status: 'published',
  };
}

export function episodeRowKey(episode: Pick<AdminSeriesEpisode, 'id' | 'season_number' | 'episode_number'>) {
  return episode.id ? `episode-${episode.id}` : `episode-${episode.season_number}-${episode.episode_number}`;
}

export function sortEpisodes<T extends { season_number: number; episode_number: number }>(episodes: T[]) {
  return [...episodes].sort((a, b) => a.season_number - b.season_number || a.episode_number - b.episode_number);
}
