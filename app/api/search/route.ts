import { NextResponse } from 'next/server';
import { supabaseRest } from '@/lib/supabase-rest';
import type { MediaType, MovieItem } from '@/lib/tmdb';

type Row = { tmdb_id: number; media_type: MediaType; title: string; title_en?: string | null; overview?: string | null; poster_url?: string | null; backdrop_url?: string | null; rating?: number | string | null; release_year?: string | null; release_date?: string | null; genres?: string[] | null; language?: string | null; runtime?: number | null; source_bucket?: string | null };
const fallback = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=70';
const select = 'tmdb_id,media_type,title,title_en,overview,poster_url,backdrop_url,rating,release_year,release_date,genres,language,runtime,source_bucket';
const bucket: Record<string, string> = { 'ซีรีส์': 'series', 'หนังไทย': 'thai', 'หนังใหม่': 'now-playing', 'คะแนนสูง': 'top-rated', 'แอ็กชัน': 'action', 'สยองขวัญ': 'horror', 'คอมเมดี้': 'comedy', Korea: 'korea', Japan: 'japan', China: 'china', 'สารคดี': 'documentary' };

function item(row: Row): MovieItem {
  const rating = Number(row.rating || 0);
  return { id: Number(row.tmdb_id), mediaType: row.media_type, title: row.title_en || row.title || `TMDB ${row.tmdb_id}`, titleEn: row.title_en || row.title || undefined, overview: row.overview || '', posterUrl: row.poster_url || fallback, backdropUrl: row.backdrop_url || row.poster_url || fallback, rating, year: row.release_year || (row.release_date ? row.release_date.slice(0, 4) : 'ไม่ระบุ'), genres: row.genres || [], runtime: row.runtime || undefined, language: row.language || undefined, status: rating >= 8 ? 'review' : 'draft', label: rating >= 8 ? '8+' : '6.5+', badges: [rating >= 8 ? '8+' : '6.5+', 'HD'] };
}

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const q = (p.get('q') || '').replace(/[,*()]/g, ' ').trim();
  const category = p.get('category') || '';
  const limit = Math.max(1, Math.min(Number(p.get('limit') || 48), 60));
  const filters = [`select=${select}`, 'is_active=eq.true', 'order=sort_score.desc', `limit=${limit}`];
  if (category === 'ภาพยนตร์') filters.push('media_type=eq.movie');
  if (category === 'ซีรีส์') filters.push('media_type=eq.tv');
  if (bucket[category]) filters.push(`source_bucket=eq.${encodeURIComponent(bucket[category])}`);
  if (q) filters.push(`or=(title.ilike.*${encodeURIComponent(q)}*,title_en.ilike.*${encodeURIComponent(q)}*,overview.ilike.*${encodeURIComponent(q)}*)`);
  const rows = await supabaseRest<Row[]>(`tmdb_catalog?${filters.join('&')}`, { mode: 'service', cache: 'no-store' }).catch(() => []);
  return NextResponse.json({ ok: true, items: rows.map(item) });
}
