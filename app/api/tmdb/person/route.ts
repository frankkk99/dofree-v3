import { NextResponse } from 'next/server';
import type { MediaType, MovieItem } from '@/lib/tmdb';

export const dynamic = 'force-dynamic';

const minTmdbRating = 0;
const imageBase = 'https://image.tmdb.org/t/p/original';
const posterBase = 'https://image.tmdb.org/t/p/w500';
const profileBase = 'https://image.tmdb.org/t/p/w500';
const fallbackImage = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80';

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

type TmdbPerson = {
  id: number;
  name?: string;
  biography?: string;
  birthday?: string | null;
  deathday?: string | null;
  place_of_birth?: string | null;
  known_for_department?: string;
  profile_path?: string | null;
  popularity?: number;
};

type SearchPersonResponse = { results?: TmdbPerson[] };

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
  job?: string;
  adult?: boolean;
};

type TmdbCreditResponse = { cast?: TmdbCredit[]; crew?: TmdbCredit[] };

type CastCredit = { id: number; name: string; character?: string; profile_path?: string | null; popularity?: number };
type WorkCreditResponse = { cast?: CastCredit[] };

type Collaborator = {
  id: number;
  name: string;
  profileUrl?: string;
  role?: string;
  count: number;
  knownFor: string[];
};

async function tmdb<T>(path: string): Promise<T | null> {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) return null;

  const response = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    next: { revalidate: 60 * 30 },
  });

  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

function toProfileUrl(path?: string | null) {
  return path ? `${profileBase}${path}` : undefined;
}

function movieKey(item: Pick<MovieItem, 'mediaType' | 'id'>) {
  return `${item.mediaType}-${item.id}`;
}

function toMovieItem(item: TmdbCredit, index: number): MovieItem | null {
  const mediaType = item.media_type === 'tv' ? 'tv' : item.media_type === 'movie' ? 'movie' : null;
  if (!mediaType || !item.id || item.adult) return null;

  const title = item.title || item.name || item.original_title || item.original_name;
  if (!title) return null;

  const rating = Number(item.vote_average || 0);
  if (rating < minTmdbRating) return null;

  const year = (item.release_date || item.first_air_date || '').slice(0, 4) || 'ไม่ระบุ';
  const genres = (item.genre_ids || []).slice(0, 3).map((id) => genreNames[id] || 'ภาพยนตร์');
  const roleLabel = item.character || item.job || 'ผลงาน';

  return {
    id: item.id,
    mediaType,
    title,
    titleEn: item.original_title || item.original_name || title,
    overview: item.overview || 'ผลงานที่เกี่ยวข้องกับนักแสดงคนนี้',
    posterUrl: item.poster_path ? `${posterBase}${item.poster_path}` : fallbackImage,
    backdropUrl: item.backdrop_path ? `${imageBase}${item.backdrop_path}` : item.poster_path ? `${posterBase}${item.poster_path}` : fallbackImage,
    rating,
    year,
    genres: genres.length ? genres : ['ภาพยนตร์'],
    language: item.original_language || 'en',
    status: rating >= 7 ? 'review' : 'draft',
    isWatchReady: false,
    label: roleLabel,
    badges: [mediaType === 'tv' ? 'Series' : 'Movie', rating >= 8 ? '8+' : '6.5+', year].filter(Boolean).slice(0, 3),
  };
}

function uniqueItems(items: MovieItem[]) {
  const map = new Map<string, MovieItem>();
  for (const item of items) map.set(movieKey(item), item);
  return [...map.values()];
}

async function resolvePerson(id: string | null, name: string | null) {
  const numericId = Number(id || 0);
  if (numericId) return numericId;

  const query = name?.trim();
  if (!query) return 0;

  const results = await tmdb<SearchPersonResponse>(`/search/person?language=th-TH&include_adult=false&query=${encodeURIComponent(query)}`);
  return results?.results?.[0]?.id || 0;
}

async function getCollaborators(personId: number, works: MovieItem[]) {
  const topWorks = works.slice(0, 6);
  const responses = await Promise.all(topWorks.map((work) => tmdb<WorkCreditResponse>(`/${work.mediaType}/${work.id}/credits?language=th-TH`)));
  const map = new Map<number, Collaborator>();

  responses.forEach((response, index) => {
    const work = topWorks[index];
    for (const cast of response?.cast?.slice(0, 12) || []) {
      if (!cast.id || cast.id === personId) continue;
      const existing = map.get(cast.id);
      if (existing) {
        existing.count += 1;
        if (!existing.knownFor.includes(work.title)) existing.knownFor.push(work.title);
        continue;
      }
      map.set(cast.id, {
        id: cast.id,
        name: cast.name,
        profileUrl: toProfileUrl(cast.profile_path),
        role: cast.character,
        count: 1,
        knownFor: [work.title],
      });
    }
  });

  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 24);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const numericId = await resolvePerson(searchParams.get('id'), searchParams.get('name'));

  if (!numericId) {
    return NextResponse.json({ ok: false, error: 'ไม่พบนักแสดง' }, { status: 404 });
  }

  const [person, credits] = await Promise.all([
    tmdb<TmdbPerson>(`/person/${numericId}?language=th-TH`),
    tmdb<TmdbCreditResponse>(`/person/${numericId}/combined_credits?language=th-TH`),
  ]);

  if (!person?.id) {
    return NextResponse.json({ ok: false, error: 'ไม่พบนักแสดง' }, { status: 404 });
  }

  const rawCredits = [...(credits?.cast || []), ...(credits?.crew || [])];
  const works = uniqueItems(
    rawCredits
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0) || (b.vote_count || 0) - (a.vote_count || 0))
      .map((credit, index) => toMovieItem(credit, index))
      .filter((item): item is MovieItem => Boolean(item))
  ).slice(0, 36);
  const collaborators = await getCollaborators(person.id, works).catch(() => []);

  return NextResponse.json({
    ok: true,
    person: {
      id: person.id,
      name: person.name || 'นักแสดง',
      biography: person.biography || '',
      birthday: person.birthday || null,
      deathday: person.deathday || null,
      placeOfBirth: person.place_of_birth || null,
      department: person.known_for_department || 'Acting',
      profileUrl: toProfileUrl(person.profile_path),
      popularity: Number(person.popularity || 0),
    },
    works,
    collaborators,
  });
}
