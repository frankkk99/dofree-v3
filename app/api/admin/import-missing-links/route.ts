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
  watch_url?: string | null;
  trailer_url?: string | null;
  provider?: string | null;
  section_slug: string;
  status: MovieStatus;
  notes?: string | null;
  is_active: boolean;
};

type ParsedRow = Record<string, string>;

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const validStatuses = new Set(['draft', 'review', 'published', 'broken', 'hidden']);

function clean(value?: string | null) {
  return value?.replace(/\s+/g, ' ').trim() || '';
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeHeader(value: string) {
  return clean(decodeHtml(value)).toLowerCase();
}

function normalizeDrivePreviewUrl(value?: string | null) {
  const url = clean(value);
  if (!url) return '';
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (url.includes('drive.google.com') && openMatch?.[1]) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  return url;
}

function cell(row: ParsedRow, names: string[]) {
  for (const name of names) {
    const value = row[name];
    if (value !== undefined && clean(value)) return clean(value);
  }
  return '';
}

function parseType(value: string): MediaType | null {
  const text = value.toLowerCase();
  if (text.includes('series') || text === 'tv' || text.includes('ซีรี')) return 'tv';
  if (text.includes('movie') || text.includes('หนัง') || text.includes('ภาพยนตร์')) return 'movie';
  return null;
}

function parseStatus(value: string, hasWatchUrl: boolean): MovieStatus {
  const text = value.toLowerCase();
  if (validStatuses.has(text)) return text as MovieStatus;
  if (text.includes('hidden') || text.includes('ซ่อน')) return 'hidden';
  if (text.includes('broken') || text.includes('เสีย')) return 'broken';
  if (text.includes('review') || text.includes('ตรวจ')) return 'review';
  if (text.includes('draft')) return 'draft';
  return hasWatchUrl ? 'published' : 'draft';
}

function htmlToRows(text: string): ParsedRow[] {
  const tableRows = [...text.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((match) => match[0]);
  if (tableRows.length < 2) return [];

  const allRows = tableRows.map((rowHtml) => [...rowHtml.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cellMatch) => clean(decodeHtml(cellMatch[1].replace(/<[^>]+>/g, '')))));
  const headers = (allRows[0] || []).map(normalizeHeader);

  return allRows.slice(1).map((values) => {
    const row: ParsedRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

function separatedToRows(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const split = (line: string) => line.split(delimiter).map((value) => clean(value.replace(/^"|"$/g, '').replace(/""/g, '"')));
  const headers = split(lines[0]).map(normalizeHeader);
  return lines.slice(1).map((line) => {
    const values = split(line);
    const row: ParsedRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

function parseRows(text: string) {
  if (/<table|<tr/i.test(text)) return htmlToRows(text);
  return separatedToRows(text);
}

function rowToRecord(row: ParsedRow): ImportRecord | null {
  const tmdbId = Number(cell(row, ['tmdb id', 'tmdb_id', 'tmdb']));
  const mediaType = parseType(cell(row, ['type', 'media_type', 'ประเภท']));
  const watchUrl = normalizeDrivePreviewUrl(cell(row, ['watch url ใส่ตรงนี้', 'watch url', 'watch_url', 'ลิงก์รับชม']));

  if (!Number.isInteger(tmdbId) || tmdbId <= 0 || !mediaType || !watchUrl) return null;

  const status = parseStatus(cell(row, ['status', 'สถานะ']), true);
  const sectionSlug = cell(row, ['category', 'section_slug', 'หมวด']) || 'watch-ready';

  return {
    tmdb_id: tmdbId,
    media_type: mediaType,
    title: cell(row, ['title en', 'title_en', 'ชื่ออังกฤษ']) || null,
    title_th: cell(row, ['title th', 'title_th', 'ชื่อไทย']) || cell(row, ['title en', 'title_en', 'ชื่ออังกฤษ']) || null,
    watch_url: watchUrl,
    trailer_url: normalizeDrivePreviewUrl(cell(row, ['trailer url', 'trailer_url'])) || null,
    provider: 'excel-import',
    section_slug: sectionSlug,
    status,
    notes: cell(row, ['notes', 'หมายเหตุ']) || null,
    is_active: status !== 'hidden',
  };
}

export async function POST(request: Request) {
  const auth = requireAdminToken(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'ไม่พบไฟล์ Excel' }, { status: 400 });
  }

  const text = await file.text();
  if (!text.trim() || text.includes('PK\u0003\u0004')) {
    return NextResponse.json({ ok: false, error: 'ตอนนี้รองรับไฟล์ .xls ที่ Export จากระบบ หรือ CSV/TSV เท่านั้น หากเป็น .xlsx ให้ Save As เป็น .xls หรือ CSV ก่อน' }, { status: 400 });
  }

  const parsedRows = parseRows(text);
  const records = parsedRows.map(rowToRecord).filter(Boolean) as ImportRecord[];

  if (!records.length) {
    return NextResponse.json({ ok: false, error: 'ไม่พบแถวที่มี TMDB ID, Type และ Watch URL' }, { status: 400 });
  }

  const chunks: ImportRecord[][] = [];
  for (let index = 0; index < records.length; index += 200) chunks.push(records.slice(index, index + 200));

  let imported = 0;
  for (const chunk of chunks) {
    await supabaseRest('admin_movie_links?on_conflict=tmdb_id,media_type', {
      method: 'POST',
      mode: 'service',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: chunk,
    });
    imported += chunk.length;
  }

  return NextResponse.json({
    ok: true,
    imported,
    parsedRows: parsedRows.length,
    skipped: parsedRows.length - imported,
  });
}
