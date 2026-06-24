import { NextResponse } from 'next/server';
import { requireAdminToken } from '@/lib/admin-auth';
import { supabaseRest } from '@/lib/supabase-rest';

type CatalogRow = {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  title?: string | null;
  title_en?: string | null;
  rating?: number | string | null;
  release_year?: string | null;
  release_date?: string | null;
  language?: string | null;
  source_bucket?: string | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  overview?: string | null;
};

type LinkRow = {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  watch_url?: string | null;
  title?: string | null;
  title_th?: string | null;
  status?: string | null;
  notes?: string | null;
};

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function key(row: { media_type: string; tmdb_id: number }) {
  return `${row.media_type}-${row.tmdb_id}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function excelCell(value: unknown) {
  return `<td style="mso-number-format:'\\@';">${escapeHtml(value)}</td>`;
}

function todayFileName() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const auth = requireAdminToken(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const source = url.searchParams.get('source') || 'all';
  const media = url.searchParams.get('media') || 'all';
  const q = url.searchParams.get('q')?.trim() || '';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 5000), 1), 10000);

  const filters = [
    'select=tmdb_id,media_type,title,title_en,rating,release_year,release_date,language,source_bucket,poster_url,backdrop_url,overview',
    'is_active=eq.true',
    'order=sort_score.desc',
    `limit=${limit}`,
  ];

  if (source !== 'all') filters.push(`source_bucket=eq.${encodeURIComponent(source)}`);
  if (media === 'movie' || media === 'tv') filters.push(`media_type=eq.${media}`);
  if (q) filters.push(`or=(title.ilike.*${encodeURIComponent(q)}*,title_en.ilike.*${encodeURIComponent(q)}*)`);

  const [catalogRows, linkRows] = await Promise.all([
    supabaseRest<CatalogRow[]>(`tmdb_catalog?${filters.join('&')}`, { mode: 'service', cache: 'no-store' }),
    supabaseRest<LinkRow[]>('admin_movie_links?is_active=eq.true&select=tmdb_id,media_type,watch_url,title,title_th,status,notes&limit=10000', { mode: 'service', cache: 'no-store' }).catch(() => []),
  ]);

  const linkMap = new Map((linkRows || []).map((row) => [key(row), row]));
  const missing = (catalogRows || []).filter((row) => !linkMap.get(key(row))?.watch_url?.trim());

  const rows = missing.map((row, index) => {
    const link = linkMap.get(key(row));
    return `<tr>
      ${excelCell(index + 1)}
      ${excelCell(row.tmdb_id)}
      ${excelCell(row.media_type === 'tv' ? 'Series' : 'Movie')}
      ${excelCell(link?.title_th || row.title)}
      ${excelCell(link?.title || row.title_en)}
      ${excelCell(row.rating)}
      ${excelCell(row.release_date || row.release_year)}
      ${excelCell(row.language)}
      ${excelCell(row.source_bucket)}
      ${excelCell(link?.status || 'missing_link')}
      ${excelCell('')}
      ${excelCell(row.poster_url)}
      ${excelCell(row.backdrop_url)}
      ${excelCell(row.overview)}
      ${excelCell(link?.notes)}
    </tr>`;
  }).join('\n');

  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>
    <table border="1">
      <thead>
        <tr style="font-weight:bold;background:#eeeeee;">
          <th>No.</th>
          <th>TMDB ID</th>
          <th>Type</th>
          <th>Title TH</th>
          <th>Title EN</th>
          <th>Rating</th>
          <th>Release Date</th>
          <th>Language</th>
          <th>Category</th>
          <th>Status</th>
          <th>Watch URL ใส่ตรงนี้</th>
          <th>Poster URL</th>
          <th>Backdrop URL</th>
          <th>Overview</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </body></html>`;

  return new Response('\ufeff' + html, {
    headers: {
      'content-type': 'application/vnd.ms-excel; charset=utf-8',
      'content-disposition': `attachment; filename="dofree-missing-links-${todayFileName()}.xls"`,
      'cache-control': 'no-store',
    },
  });
}
