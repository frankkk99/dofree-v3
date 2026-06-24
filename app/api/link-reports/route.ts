import { NextResponse } from 'next/server';
import { supabaseRest } from '@/lib/supabase-rest';

type MediaType = 'movie' | 'tv';

function cleanText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const tmdbId = Number(body?.tmdb_id);
  const mediaType = cleanText(body?.media_type) as MediaType | undefined;

  if (mediaType !== 'movie' && mediaType !== 'tv') {
    return NextResponse.json({ ok: false, error: 'media_type ต้องเป็น movie หรือ tv' }, { status: 400 });
  }

  const reason = cleanText(body?.reason);
  const record = {
    tmdb_id: Number.isInteger(tmdbId) && tmdbId > 0 ? tmdbId : null,
    media_type: mediaType,
    title: cleanText(body?.title) || null,
    title_th: cleanText(body?.title_th) || cleanText(body?.title) || null,
    url: cleanText(body?.url) || null,
    reason: reason === 'broken_link' ? 'ลิงก์เสีย / เปิดไม่ได้' : reason || 'เปิดไม่ได้',
    detail: cleanText(body?.detail) || null,
    status: 'pending',
  };

  try {
    const rows = await supabaseRest('link_reports', {
      method: 'POST',
      mode: 'anon',
      prefer: 'return=representation',
      body: [record],
    });

    return NextResponse.json({ ok: true, report: Array.isArray(rows) ? rows[0] : rows });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot create link report' }, { status: 500 });
  }
}
