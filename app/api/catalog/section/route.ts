import { NextResponse } from 'next/server';
import { supabaseRest } from '@/lib/supabase-rest';
import type { MediaType, MovieItem } from '@/lib/tmdb';

type Row = { tmdb_id: number; media_type: MediaType; title: string; title_en?: string | null; overview?: string | null; poster_url?: string | null; backdrop_url?: string | null; rating?: number | string | null; release_year?: string | null; release_date?: string | null; genres?: string[] | null; language?: string | null; runtime?: number | null };
const select = 'tmdb_id,media_type,title,title_en,overview,poster_url,backdrop_url,rating,release_year,release_date,genres,language,runtime';
const fallback = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=70';

function toItem(row: Row): MovieItem {
  const rating = Number(row.rating || 0);
  return { id: Number(row.tmdb_id), mediaType: row.media_type, title: row.title_en || row.title || `TMDB ${row.tmdb_id}`, titleEn: row.title_en || row.title || undefined, overview: row.overview || '', posterUrl: row.poster_url || fallback, backdropUrl: row.backdrop_url || row.poster_url || fallback, rating, year: row.release_year || (row.release_date ? row.release_date.slice(0, 4) : 'ไม่ระบุ'), genres: row.genres || [], runtime: row.runtime || undefined, language: row.language || undefined, status: rating >= 8 ? 'review' : 'draft', label: rating >= 8 ? '8+' : '6.5+', badges: [rating >= 8 ? '8+' : '6.5+', 'HD'] };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const slug = params.get('slug') || 'popular';
  const limit = Math.max(1, Math.min(Number(params.get('limit') || 9), 24));
  const offset = Math.max(0, Number(params.get('offset') || 0));
  const rows = await supabaseRest<Row[]>(`tmdb_catalog?select=${select}&is_active=eq.true&source_bucket=eq.${encodeURIComponent(slug)}&order=sort_score.desc&limit=${limit + 1}&offset=${offset}`, { mode: 'service', cache: 'no-store' }).catch(() => []);
  return NextResponse.json({ ok: true, slug, items: rows.slice(0, limit).map(toItem), hasMore: rows.length > limit });
}
