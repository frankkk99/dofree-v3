import { NextResponse } from 'next/server';
import type { MediaType, MovieItem } from '@/lib/tmdb';

type TmdbPerson = {
  id: number;
  name?: string;
  profile_path?: string | null;
};

type TmdbCredit = {
  id: number;
  media_type?: MediaType | string;
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
  original_language?: string;
  popularity?: number;
  vote_count?: number;
  character?: string;
};

type TmdbCreditResponse = {
  cast?: TmdbCredit[];
};

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

const fallbackImage = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80';

async function tmdb<T>(path: string): Promise<T | null> {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) return null;

  const response = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

function toMovieItem(item: TmdbCredit, index: number): MovieItem | null {
  const mediaType = item.media_type === 'tv' ? 'tv' : item.media_type === 'movie' ? 'movie' : null;
  if (!mediaType) return null;
  if (!item.poster_path && !item.backdrop_path) return null;

  const title = item.title || item.name || item.original_title || item.original_name;
  if (!title) return null;

  const year = (item.release_date || item.first_air_date || '').slice(0, 4) || 'ไม่ระบุ';
  const rating = Number(item.vote_average || 0);
  const genres = (item.genre_ids || []).slice(0, 3).map((id) => genreNames[id] || 'ภาพยนตร์');

  const base: MovieItem = {
    id: item.id,
    mediaType,
    title,
    titleEn: item.original_title || item.original_name,
    overview: item.overview || `ผลงานที่ ${index + 1} ของนักแสดงคนนี้จากฐานข้อมูล TMDB`,
    posterUrl: item.poster_path ? `${posterBase}${item.poster_path}` : fallbackImage,
    backdropUrl: item.backdrop_path ? `${imageBase}${item.backdrop_path}` : item.poster_path ? `${posterBase}${item.poster_path}` : fallbackImage,
    rating,
    year,
    genres: genres.length ? genres : ['ภาพยนตร์'],
    language: item.original_language || 'en',
    status: 'review',
    isWatchReady: false,
    label: item.character ? item.character : index < 3 ? 'ผลงาน' : undefined,
    badges: [index < 3 ? 'ผลงาน' : mediaType === 'tv' ? 'Series' : 'Movie', rating >= 8 ? '8+' : undefined, 'HD'].filter(Boolean) as string[],
  };

  return base;
}

function uniqueItems(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(`${item.mediaType}-${item.id}`, item);
  return [...map.values()];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const numericId = Number(id);

  if (!numericId) {
    return NextResponse.json({ error: 'Invalid TMDB person request' }, { status: 400 });
  }

  const [person, credits] = await Promise.all([
    tmdb<TmdbPerson>(`/person/${numericId}?language=th-TH`),
    tmdb<TmdbCreditResponse>(`/person/${numericId}/combined_credits?language=th-TH`),
  ]);

  const items = uniqueItems(
    (credits?.cast || [])
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0) || (b.vote_count || 0) - (a.vote_count || 0))
      .map((credit, index) => toMovieItem(credit, index))
      .filter((item): item is MovieItem => Boolean(item))
  ).slice(0, 36);

  return NextResponse.json({
    person: person?.id
      ? {
          id: person.id,
          name: person.name || 'นักแสดง',
          profileUrl: person.profile_path ? `${profileBase}${person.profile_path}` : undefined,
        }
      : undefined,
    items,
  });
}
