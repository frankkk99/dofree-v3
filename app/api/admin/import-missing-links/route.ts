import { NextResponse } from 'next/server';
import { requireAdminToken } from '@/lib/admin-auth';
import { supabaseRest } from '@/lib/supabase-rest';

type MediaType = 'movie' | 'tv';
type MovieStatus = 'draft' | 'review' | 'published' | 'broken' | 'hidden';

type ImportRecord = {
  tmdb_id: number;
  media_type: MediaType;
  title?: string | null;
  title_th?: string | null;
  watch_url: string;
  provider: string;
  section_slug: string;
  status: MovieStatus;
  notes?: string | null;
  is_active: boolean;
};

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function clean(value?: string | null) {
  return value?.replace(/^\ufeff/, '').trim() || '';
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some((value) => clean(value))) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => clean(value))) rows.push(row);
  return rows;
}

function normalizeHeader(value: string) {
  return clean(value).toLowerCase();
}

function normalizeWatchUrl(value: string) {
  const url = clean(value);
  if (!url) return '';
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (url.includes('drive.google.com') && openMatch?.[1]) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  return url;
}

function typeFrom(value: string): MediaType | null {
  const text = clean(value).toLowerCase();
  if (text === 'movie' || text.includes('หนัง')) return 'movie';
  if (text === 'tv' || text === 'series' || text.includes('ซีรี')) return 'tv';
  return null;
}

function statusFrom(value: string, hasWatchUrl: boolean): MovieStatus {
  const text = clean(value).toLowerCase();
  if (text === 'draft' || text === 'review' || text === 'published' || text === 'broken' || text === 'hidden') return text;
  if (text.includes('เสีย')) return 'broken';
  if (text.includes('ซ่อน')) return 'hidden';
  return hasWatchUrl ? 'published' : 'draft';
}

function pick(row: Record<string, string>, names: string[]) {
  for (const name of names) {
    const value = row[name];
    if (clean(value)) return clean(value);
  }
  return '';
}

function toRecord(row: Record<string, string>): ImportRecord | null {
  const tmdbId = Number(pick(row, ['tmdb id', 'tmdb_id', 'tmdb']));
  const mediaType = typeFrom(pick(row, ['type', 'media_type', 'ประเภท']));
  const watchUrl = normalizeWatchUrl(pick(row, ['watch url', 'watch_url', 'watch url ใส่ตรงนี้', 'ลิงก์รับชม']));
  if (!Number.isInteger(tmdbId) || tmdbId <= 0 || !mediaType || !watchUrl) return null;

  const status = statusFrom(pick(row, ['status', 'สถานะ']), true);
  return {
    tmdb_id: tmdbId,
    media_type: mediaType,
    title_th: pick(row, ['title th', 'title_th', 'ชื่อไทย']) || pick(row, ['title en', 'title_en', 'ชื่ออังกฤษ']) || null,
    title: pick(row, ['title en', 'title_en', 'ชื่ออังกฤษ']) || null,
    watch_url: watchUrl,
    provider: 'excel-import',
    section_slug: pick(row, ['category', 'section_slug', 'หมวด']) || 'watch-ready',
    status,
    notes: pick(row, ['notes', 'หมายเหตุ']) || null,
    is_active: status !== 'hidden',
  };
}

export async function POST(request: Request) {
  const auth = requireAdminToken(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'ไม่พบไฟล์' }, { status: 400 });

  const text = await file.text();
  if (!text.trim() || text.startsWith('PK')) {
    return NextResponse.json({ ok: false, error: 'รองรับไฟล์ CSV ที่ Export จากระบบนี้ก่อน ถ้าเป็น .xlsx ให้ Save As เป็น CSV ก่อน' }, { status: 400 });
  }

  const table = parseCsv(text);
  const headers = (table[0] || []).map(normalizeHeader);
  const records = table.slice(1).map((values) => {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => { row[header] = values[index] || ''; });
    return toRecord(row);
  }).filter(Boolean) as ImportRecord[];

  if (!records.length) return NextResponse.json({ ok: false, error: 'ไม่พบแถวที่มี TMDB ID, Type และ Watch URL' }, { status: 400 });

  for (let index = 0; index < records.length; index += 200) {
    await supabaseRest('admin_movie_links?on_conflict=tmdb_id,media_type', {
      method: 'POST',
      mode: 'service',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: records.slice(index, index + 200),
    });
  }

  return NextResponse.json({ ok: true, imported: records.length, parsedRows: Math.max(table.length - 1, 0), skipped: Math.max(table.length - 1 - records.length, 0) });
}
