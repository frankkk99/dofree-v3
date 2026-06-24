import { NextResponse } from 'next/server';
import { requireAdminToken } from '@/lib/admin-auth';
import { supabaseRest } from '@/lib/supabase-rest';

type MediaType = 'movie' | 'tv';

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

type TmdbResponse = { results?: TmdbItem[] };

type SourceDef = {
  slug: string;
  country?: string;
  mediaType: MediaType;
  path: string;
  pages: number;
  discover?: boolean;
};

type SyncBody = {
  cursor?: number;
  pagesPerRun?: number;
  targetLimit?: number;
};

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const minRating = 6.5;
const minVoteCount = 80;
const defaultPagesPerRun = 20;
const maxPagesPerRun = 40;
const imageBase = 'https://image.tmdb.org/t/p/original';
const posterBase = 'https://image.tmdb.org/t/p/w500';

const sourceDefs: SourceDef[] = [
  { slug: 'top-rated', mediaType: 'movie', path: '/movie/top_rated?language=th-TH', pages: 40 },
  { slug: 'popular', mediaType: 'movie', path: '/movie/popular?language=th-TH&region=TH', pages: 30 },
  { slug: 'now-playing', mediaType: 'movie', path: '/movie/now_playing?language=th-TH&region=TH', pages: 15 },
  { slug: 'series', mediaType: 'tv', path: '/tv/popular?language=th-TH', pages: 30 },
  { slug: 'thai', country: 'th', mediaType: 'movie', path: '/discover/movie?language=th-TH&with_original_language=th&sort_by=vote_average.desc', pages: 35, discover: true },
  { slug: 'action', mediaType: 'movie', path: '/discover/movie?language=th-TH&with_genres=28&sort_by=vote_average.desc', pages: 35, discover: true },
  { slug: 'adventure', mediaType: 'movie', path: '/discover/movie?language=th-TH&with_genres=12&sort_by=vote_average.desc', pages: 35, discover: true },
  { slug: 'animation', mediaType: 'movie', path: '/discover/movie?language=th-TH&with_genres=16&sort_by=vote_average.desc', pages: 35, discover: true },
  { slug: 'drama', mediaType: 'movie', path: '/discover/movie?language=th-TH&with_genres=18&sort_by=vote_average.desc', pages: 35, discover: true },
  { slug: 'thriller', mediaType: 'movie', path: '/discover/movie?language=th-TH&with_genres=53&sort_by=vote_average.desc', pages: 35, discover: true },
  { slug: 'horror', mediaType: 'movie', path: '/discover/movie?language=th-TH&with_genres=27&sort_by=vote_average.desc', pages: 35, discover: true },
  { slug: 'comedy', mediaType: 'movie', path: '/discover/movie?language=th-TH&with_genres=35&sort_by=vote_average.desc', pages: 35, discover: true },
  { slug: 'sci-fi', mediaType: 'movie', path: '/discover/movie?language=th-TH&with_genres=878&sort_by=vote_average.desc', pages: 35, discover: true },
  { slug: 'romance', mediaType: 'movie', path: '/discover/movie?language=th-TH&with_genres=10749&sort_by=vote_average.desc', pages: 35, discover: true },
  { slug: 'fantasy', mediaType: 'movie', path: '/discover/movie?language=th-TH&with_genres=14&sort_by=vote_average.desc', pages: 35, discover: true },
  { slug: 'crime', mediaType: 'movie', path: '/discover/movie?language=th-TH&with_genres=80&sort_by=vote_average.desc', pages: 35, discover: true },
  { slug: 'mystery', mediaType: 'movie', path: '/discover/movie?language=th-TH&with_genres=9648&sort_by=vote_average.desc', pages: 35, discover: true },
  { slug: 'family', mediaType: 'movie', path: '/discover/movie?language=th-TH&with_genres=10751&sort_by=vote_average.desc', pages: 25, discover: true },
  { slug: 'documentary', mediaType: 'movie', path: '/discover/movie?language=th-TH&with_genres=99&sort_by=vote_average.desc', pages: 25, discover: true },
  { slug: 'korea', country: 'ko', mediaType: 'movie', path: '/discover/movie?language=th-TH&with_original_language=ko&sort_by=vote_average.desc', pages: 35, discover: true },
  { slug: 'japan', country: 'ja', mediaType: 'movie', path: '/discover/movie?language=th-TH&with_original_language=ja&sort_by=vote_average.desc', pages: 35, discover: true },
  { slug: 'china', country: 'zh', mediaType: 'movie', path: '/discover/movie?language=th-TH&with_original_language=zh&sort_by=vote_average.desc', pages: 35, discover: true },
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

function addHighRatedQuery(path: string) {
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}vote_average.gte=${minRating}&vote_count.gte=${minVoteCount}&include_adult=false`;
}

function tasks() {
  return sourceDefs.flatMap((source) => Array.from({ length: source.pages }, (_, pageIndex) => ({ source, page: pageIndex + 1 })));
}

async function tmdb<T>(path: string): Promise<T | null> {
  const token = process.env.TMDB_ACCESS_TOKEN?.trim();
  if (!token) throw new Error('Missing TMDB_ACCESS_TOKEN');

  const response = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

function qualified(item: TmdbItem) {
  const rating = Number(item.vote_average || 0);
  const voteCount = Number(item.vote_count || 0);
  const hasTitle = Boolean(item.title || item.name || item.original_title || item.original_name);
  const hasImage = Boolean(item.poster_path || item.backdrop_path);
  return hasTitle && hasImage && !item.adult && rating >= minRating && voteCount >= minVoteCount;
}

function rowFromItem(item: TmdbItem, source: SourceDef) {
  const rating = Number(item.vote_average || 0);
  const voteCount = Number(item.vote_count || 0);
  const popularity = Number(item.popularity || 0);
  const releaseDate = item.release_date || item.first_air_date || null;
  const genreIds = item.genre_ids || [];

  return {
    tmdb_id: item.id,
    media_type: source.mediaType,
    title: item.title || item.name || item.original_title || item.original_name || `TMDB ${item.id}`,
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
    country_bucket: source.country || item.original_language || null,
    source_bucket: source.slug,
    sort_score: rating * 100000 + Math.min(voteCount, 20000) + popularity,
    is_active: true,
    raw: item,
    synced_at: new Date().toISOString(),
  };
}

async function upsertRows(rows: ReturnType<typeof rowFromItem>[]) {
  if (!rows.length) return 0;
  let total = 0;
  for (let index = 0; index < rows.length; index += 200) {
    const chunk = rows.slice(index, index + 200);
    await supabaseRest('tmdb_catalog?on_conflict=tmdb_id,media_type', {
      method: 'POST',
      mode: 'service',
      body: chunk,
      prefer: 'resolution=merge-duplicates,return=minimal',
    });
    total += chunk.length;
  }
  return total;
}

async function readBody(request: Request): Promise<SyncBody> {
  const text = await request.text().catch(() => '');
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as SyncBody;
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const auth = requireAdminToken(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await readBody(request);
  const allTasks = tasks();
  const cursor = Math.max(0, Number(body.cursor || 0));
  const pagesPerRun = Math.min(Math.max(Number(body.pagesPerRun || defaultPagesPerRun), 1), maxPagesPerRun);
  const targetLimit = Math.min(Math.max(Number(body.targetLimit || 10000), 100), 10000);
  const selectedTasks = allTasks.slice(cursor, cursor + pagesPerRun);

  if (!selectedTasks.length) {
    return NextResponse.json({ ok: true, upserted: 0, skipped: 0, cursor, nextCursor: cursor, totalTasks: allTasks.length, done: true });
  }

  const run = await supabaseRest<{ id: number }[]>('tmdb_catalog_sync_runs?select=id', {
    method: 'POST',
    mode: 'service',
    body: { requested_limit: targetLimit, status: 'running' },
    prefer: 'return=representation',
  });
  const runId = run?.[0]?.id;

  let skipped = 0;
  let upserted = 0;

  try {
    const collected = new Map<string, ReturnType<typeof rowFromItem>>();

    const results = await Promise.all(
      selectedTasks.map(async (task) => {
        const basePath = task.source.discover ? addHighRatedQuery(task.source.path) : task.source.path;
        const joiner = basePath.includes('?') ? '&' : '?';
        return { task, data: await tmdb<TmdbResponse>(`${basePath}${joiner}page=${task.page}`) };
      })
    );

    for (const { task, data } of results) {
      for (const item of data?.results || []) {
        if (!qualified(item)) {
          skipped += 1;
          continue;
        }
        const row = rowFromItem(item, task.source);
        collected.set(`${row.media_type}-${row.tmdb_id}`, row);
      }
    }

    const rows = [...collected.values()].sort((a, b) => b.sort_score - a.sort_score).slice(0, targetLimit);
    upserted = await upsertRows(rows);
    const done = cursor + selectedTasks.length >= allTasks.length;

    if (runId) {
      await supabaseRest(`tmdb_catalog_sync_runs?id=eq.${runId}`, {
        method: 'PATCH',
        mode: 'service',
        body: {
          status: done ? 'success' : 'partial',
          inserted_count: upserted,
          updated_count: upserted,
          skipped_count: skipped,
          finished_at: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      ok: true,
      runId,
      upserted,
      skipped,
      cursor,
      pagesPerRun,
      nextCursor: cursor + selectedTasks.length,
      totalTasks: allTasks.length,
      done,
      message: 'Batch synced. Run again with nextCursor until done.',
    });
  } catch (error) {
    if (runId) {
      await supabaseRest(`tmdb_catalog_sync_runs?id=eq.${runId}`, {
        method: 'PATCH',
        mode: 'service',
        body: {
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown sync error',
          inserted_count: upserted,
          skipped_count: skipped,
          finished_at: new Date().toISOString(),
        },
      }).catch(() => null);
    }

    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown sync error' }, { status: 500 });
  }
}
