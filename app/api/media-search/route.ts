import { NextResponse } from 'next/server';
import type { MediaType } from '@/lib/tmdb';

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
  original_language?: string;
  adult?: boolean;
};

type TmdbResponse = {
  results?: TmdbItem[];
};

type MediaSearchItem = {
  id: number;
  mediaType: MediaType;
  title: string;
  titleEn?: string;
  year: string;
  posterUrl: string;
  backdropUrl: string;
  rating: number;
  voteCount: number;
  genres: string[];
  language?: string;
};

const posterBase = 'https://image.tmdb.org/t/p/w500';
const imageBase = 'https://image.tmdb.org/t/p/original';
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
  10759: 'แอ็กชันผจญภัย',
  10765: 'ไซไฟแฟนตาซี',
  10768: 'สงคราม',
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function tmdb(path: string) {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) throw new Error('Missing TMDB_ACCESS_TOKEN');

  const response = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`TMDB request failed with ${response.status}`);
  return response.json() as Promise<TmdbResponse>;
}

function hasTitle(item: TmdbItem) {
  return Boolean(item.title || item.name || item.original_title || item.original_name);
}

function toSearchItem(item: TmdbItem, mediaType: MediaType): MediaSearchItem | null {
  if (!item.id || item.adult || !hasTitle(item)) return null;

  const title = item.title || item.name || item.original_title || item.original_name || '';
  const titleEn = item.original_title || item.original_name || undefined;
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const posterUrl = item.poster_path ? `${posterBase}${item.poster_path}` : '';
  const backdropUrl = item.backdrop_path ? `${imageBase}${item.backdrop_path}` : posterUrl;

  return {
    id: item.id,
    mediaType,
    title,
    titleEn,
    year,
    posterUrl,
    backdropUrl,
    rating: Number(item.vote_average || 0),
    voteCount: Number(item.vote_count || 0),
    genres: (item.genre_ids || []).slice(0, 4).map((id) => genreNames[id] || 'ภาพยนตร์'),
    language: item.original_language,
  };
}

function dedupe(items: MediaSearchItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.mediaType}-${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = (url.searchParams.get('q') || '').trim();
    if (query.length < 2) return NextResponse.json({ ok: true, results: [] });

    const [movie, tv] = await Promise.all([
      tmdb(`/search/movie?language=th-TH&query=${encodeURIComponent(query)}&include_adult=false&page=1`),
      tmdb(`/search/tv?language=th-TH&query=${encodeURIComponent(query)}&include_adult=false&page=1`),
    ]);

    const results = dedupe([
      ...(movie.results || []).map((item) => toSearchItem(item, 'movie')),
      ...(tv.results || []).map((item) => toSearchItem(item, 'tv')),
    ].filter(Boolean) as MediaSearchItem[])
      .sort((a, b) => (b.voteCount + b.rating * 100) - (a.voteCount + a.rating * 100))
      .slice(0, 20);

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot search media';
    return jsonError(message, 500);
  }
}
