import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    return NextResponse.json({
      ok: true,
      message: 'รับรายงานลิงก์เสียแล้ว',
      report: {
        tmdb_id: payload?.tmdb_id || null,
        media_type: payload?.media_type || 'movie',
        title: payload?.title || null,
        reason: payload?.reason || 'broken_link',
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ ok: false, message: 'ข้อมูลรายงานไม่ถูกต้อง' }, { status: 400 });
  }
}
