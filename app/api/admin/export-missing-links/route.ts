import { NextResponse } from 'next/server';
import { requireAdminToken } from '@/lib/admin-auth';
import { supabaseRest } from '@/lib/supabase-rest';

type MediaType = 'movie' | 'tv';

type CatalogRow = {
  tmdb_id: number;
  media_type: MediaType;
  title?: string | null;
  title_en?: string | null;
  rating?: number | string | null;
  release_year?: string | null;
  release_date?: string | null;
  language?: string | null;
  source_bucket?: string | null;
};

type LinkRow = {
  tmdb_id: number;
  media_type: MediaType;
  watch_url?: string | null;
  status?: string | null;
};

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function rowKey(row: { media_type: MediaType; tmdb_id: number }) {
  return `${row.media_type}-${row.tmdb_id}`;
}

function csvCell(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function fileDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const auth = requireAdminToken(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const source = url.searchParams.get('source') || 'all';
  const media = url.searchParams.get('media') || 'all';
  const q = url.searchParams.get('q')?.trim() || '';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 5000), 1), 10000);

  const filters = [
    'select=tmdb_id,media_type,title,title_en,rating,release_year,release_date,language,source_bucket',
    'is_active=eq.true',
    'order=sort_score.desc',
    `limit=${limit}`,
  ];

  if (source !== 'all') filters.push(`source_bucket=eq.${encodeURIComponent(source)}`);
  if (media === 'movie' || media === 'tv') filters.push(`media_type=eq.${media}`);
  if (q) filters.push(`or=(title.ilike.*${encodeURIComponent(q)}*,title_en.ilike.*${encodeURIComponent(q)}*)`);

  const [catalogRows, linkRows] = await Promise.all([
    supabaseRest<CatalogRow[]>(`tmdb_catalog?${filters.join('&')}`, { mode: 'service', cache: 'no-store' }),
    supabaseRest<LinkRow[]>('admin_movie_links?is_active=eq.true&select=tmdb_id,media_type,watch_url,status&limit=10000', { mode: 'service', cache: 'no-store' }).catch(() => []),
  ]);

  const linkMap = new Map((linkRows || []).map((row) => [rowKey(row), row]));
  const rows = (catalogRows || []).filter((row) => !linkMap.get(rowKey(row))?.watch_url?.trim());

  const header = ['No', 'TMDB ID', 'Type', 'Title TH', 'Title EN', 'Rating', 'Release Date', 'Language', 'Category', 'Status', 'Watch URL'];
  const body = rows.map((row, index) => [
    index + 1,
    row.tmdb_id,
    row.media_type,
    row.title || '',
    row.title_en || '',
    row.rating || '',
    row.release_date || row.release_year || '',
    row.language || '',
    row.source_bucket || '',
    linkMap.get(rowKey(row))?.status || 'missing_link',
    '',
  ].map(csvCell).join(','));

  const csv = `\ufeff${header.map(csvCell).join(',')}\n${body.join('\n')}`;

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="dofree-missing-links-${fileDate()}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
