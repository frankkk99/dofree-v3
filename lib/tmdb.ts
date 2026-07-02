import { mediaDetailPath } from './seo';

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
  voteCount?: number;
  year: string;
  releaseDate?: string;
  genres?: string[];
  runtime?: number;
  language?: string;
  status?: MovieStatus;
  isWatchReady?: boolean;
  watchUrl?: string;
  trailerUrl?: string;
  episodeCount?: number;
  label?: string;
  badges?: string[];
  searchText?: string;
  hiddenSearchTerms?: string[];
};

export type MovieSection = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  items: MovieItem[];
  autoplay?: boolean;
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

export type MediaImagePayload = {
  posterUrl: string;
  backdropUrl: string;
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
};
type WatchLinkLookup = Map<string, WatchLinkRecord>;

type SourceDef = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  path: string;
  mediaType: MediaType;
  pages: number;
  limit: number;
  offset: number;
  discover?: boolean;
};

const minTmdbRating = 6.5;
const minVoteCount = 80;
const imageBase = 'https://image.tmdb.org/t/p/original';
const posterBase = 'https://image.tmdb.org/t/p/w500';
const profileBase = 'https://image.tmdb.org/t/p/w185';

const fallbackImages = [
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=1400&q=80',
];
