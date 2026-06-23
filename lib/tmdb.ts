export type MovieItem = {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  titleEn?: string;
  overview?: string;
  posterUrl: string;
  backdropUrl: string;
  rating: number;
  year: string;
  genres?: string[];
  isWatchReady?: boolean;
  label?: string;
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
  sections: MovieSection[];
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
};

const imageBase = 'https://image.tmdb.org/t/p/original';
const posterBase = 'https://image.tmdb.org/t/p/w500';

const genreNames: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  18: 'Drama',
  27: 'Horror',
  35: 'Comedy',
  53: 'Thriller',
  878: 'Sci-Fi',
  10749: 'Romance',
  99: 'Documentary',
};

const fallbackPosters = [
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=900&q=80',
];

const fallback: HomePayload = {
  source: 'fallback',
  hero: {
    id: 1,
    mediaType: 'movie',
    title: 'DOFree Originals',
    titleEn: 'Cinematic Movie Platform',
    overview: 'เว็บหนังโทนมืดพรีเมียมสำหรับค้นหา จัดหมวด ดูรายละเอียด และต่อยอดเป็นแพลตฟอร์มคอนเทนต์เต็มระบบ',
    posterUrl: fallbackPosters[0],
    backdropUrl: fallbackPosters[0],
    rating: 8.8,
    year: '2026',
    genres: ['Movie', 'Platform', 'CMS'],
    isWatchReady: true,
    label: 'V3 Preview',
  },
  sections: [
    {
      slug: 'watch-ready',
      eyebrow: 'พร้อมรับชม',
      title: 'ดูได้แล้วที่นี่',
      description: 'แถวแรกสำหรับคอนเทนต์ที่แอดมินเปิดใช้งานและพร้อมกดรับชม',
      items: Array.from({ length: 10 }, (_, index) => ({
        id: 1000 + index,
        mediaType: 'movie',
        title: ['Red Signal', 'Midnight Archive', 'Last Frame', 'Shadow City', 'Final Cut'][index % 5],
        titleEn: 'DOFree Preview',
        overview: 'ตัวอย่างการ์ดภาพยนตร์สำหรับหน้าแรก DOFree v3',
        posterUrl: fallbackPosters[index % fallbackPosters.length],
        backdropUrl: fallbackPosters[index % fallbackPosters.length],
        rating: 8.1 + (index % 5) / 10,
        year: '2026',
        genres: ['Thriller', 'Drama'],
        isWatchReady: true,
        label: index % 2 === 0 ? 'New' : 'HD',
      })),
    },
    {
      slug: 'popular',
      eyebrow: 'แนะนำ',
      title: 'ยอดนิยมตอนนี้',
      description: 'คอนเทนต์ที่เหมาะสำหรับดึงผู้ใช้ให้เลื่อนดูต่อ',
      items: Array.from({ length: 10 }, (_, index) => ({
        id: 2000 + index,
        mediaType: 'movie',
        title: ['Orbit 9', 'The Blue Night', 'Deep Signal', 'North Gate', 'Hidden Echo'][index % 5],
        titleEn: 'Popular Preview',
        overview: 'ตัวอย่างการ์ดภาพยนตร์ยอดนิยม',
        posterUrl: fallbackPosters[(index + 1) % fallbackPosters.length],
        backdropUrl: fallbackPosters[(index + 1) % fallbackPosters.length],
        rating: 7.4 + (index % 6) / 10,
        year: '2025',
        genres: ['Action', 'Sci-Fi'],
        label: index % 3 === 0 ? 'Top' : undefined,
      })),
    },
  ],
};

function toMovieItem(item: TmdbItem, mediaType: 'movie' | 'tv', index: number): MovieItem {
  const posterUrl = item.poster_path ? `${posterBase}${item.poster_path}` : fallbackPosters[index % fallbackPosters.length];
  const backdropUrl = item.backdrop_path ? `${imageBase}${item.backdrop_path}` : posterUrl;
  const year = (item.release_date || item.first_air_date || '').slice(0, 4) || '2026';
  const rating = Number(item.vote_average || 0);

  return {
    id: item.id,
    mediaType,
    title: item.title || item.name || item.original_title || item.original_name || 'Untitled',
    titleEn: item.original_title || item.original_name,
    overview: item.overview || '',
    posterUrl,
    backdropUrl,
    rating,
    year,
    genres: (item.genre_ids || []).slice(0, 3).map((id) => genreNames[id] || 'Movie'),
    isWatchReady: rating >= 8,
    label: rating >= 8 ? '8+' : index < 3 ? 'New' : undefined,
  };
}

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

export async function getHomePayload(): Promise<HomePayload> {
  const [nowPlaying, popular, topRated, thai] = await Promise.all([
    tmdb('/movie/now_playing?language=th-TH&page=1&region=TH'),
    tmdb('/movie/popular?language=th-TH&page=1&region=TH'),
    tmdb('/movie/top_rated?language=th-TH&page=1'),
    tmdb('/discover/movie?language=th-TH&with_original_language=th&sort_by=popularity.desc&page=1'),
  ]);

  if (!nowPlaying?.results?.length && !popular?.results?.length) return fallback;

  const hero = toMovieItem((nowPlaying?.results || popular?.results)[0], 'movie', 0);
  const readyItems = [...(topRated?.results || []), ...(nowPlaying?.results || [])]
    .map((item: TmdbItem, index: number) => toMovieItem(item, 'movie', index))
    .filter((item: MovieItem) => item.rating >= 8)
    .slice(0, 14);

  return {
    source: 'tmdb',
    hero,
    sections: [
      {
        slug: 'watch-ready',
        eyebrow: 'พร้อมรับชม',
        title: 'ดูได้แล้วที่นี่',
        description: 'คัดเรื่องคะแนนสูงและพร้อมดันเป็นแถวหลักของเว็บ',
        items: readyItems.length ? readyItems : (popular?.results || []).slice(0, 10).map((item: TmdbItem, index: number) => toMovieItem(item, 'movie', index)),
      },
      {
        slug: 'now-playing',
        eyebrow: 'กำลังมาแรง',
        title: 'กำลังฉายในกระแส',
        description: 'แถวภาพยนตร์ใหม่สำหรับสร้างความรู้สึกสดและมีชีวิต',
        items: (nowPlaying?.results || []).slice(0, 14).map((item: TmdbItem, index: number) => toMovieItem(item, 'movie', index)),
      },
      {
        slug: 'popular',
        eyebrow: 'แนะนำ',
        title: 'ยอดนิยมตอนนี้',
        description: 'หนังที่คนค้นหาและมีแนวโน้มคลิกสูง',
        items: (popular?.results || []).slice(0, 14).map((item: TmdbItem, index: number) => toMovieItem(item, 'movie', index)),
      },
      {
        slug: 'thai',
        eyebrow: 'Local Focus',
        title: 'หนังไทย',
        description: 'หมวดเฉพาะทางสำหรับตลาดไทยและ SEO ภาษาไทย',
        items: (thai?.results || []).slice(0, 14).map((item: TmdbItem, index: number) => toMovieItem(item, 'movie', index)),
      },
    ].filter((section) => section.items.length),
  };
}
