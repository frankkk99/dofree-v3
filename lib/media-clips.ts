import type { MediaType } from '@/lib/tmdb';

export type MediaClipType = 'shorts' | 'trailer' | 'summary' | 'spoiler' | 'scene' | 'review';
export type MediaClipSpoilerLevel = 'none' | 'light' | 'heavy';
export type MediaClipLanguage = 'thai_dub' | 'thai_sub' | 'thai' | 'english' | 'other';
export type MediaClipStatus = 'draft' | 'published' | 'hidden';

export type MediaClipRow = {
  id: string;
  title: string;
  description?: string | null;
  youtube_url: string;
  youtube_video_id: string;
  embed_url: string;
  thumbnail_url?: string | null;
  clip_type: MediaClipType;
  spoiler_level: MediaClipSpoilerLevel;
  language: MediaClipLanguage;
  media_type?: MediaType | null;
  tmdb_id?: number | null;
  media_title?: string | null;
  media_slug?: string | null;
  poster_url?: string | null;
  genres: string[];
  status: MediaClipStatus;
  show_home: boolean;
  show_clips: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type MediaClipInput = {
  title: string;
  description?: string;
  youtubeUrl: string;
  clipType: MediaClipType;
  spoilerLevel: MediaClipSpoilerLevel;
  language: MediaClipLanguage;
  mediaType?: MediaType;
  tmdbId?: number;
  mediaTitle?: string;
  mediaSlug?: string;
  posterUrl?: string;
  genres?: string[];
  status?: MediaClipStatus;
  showHome?: boolean;
  showClips?: boolean;
  sortOrder?: number;
};

export const mediaClipTypes: MediaClipType[] = ['shorts', 'trailer', 'summary', 'spoiler', 'scene', 'review'];
export const mediaClipSpoilerLevels: MediaClipSpoilerLevel[] = ['none', 'light', 'heavy'];
export const mediaClipLanguages: MediaClipLanguage[] = ['thai_dub', 'thai_sub', 'thai', 'english', 'other'];
export const mediaClipStatuses: MediaClipStatus[] = ['draft', 'published', 'hidden'];
