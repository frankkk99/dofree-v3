import { NextResponse } from 'next/server';
import { getDetailPayload, type MediaType } from '@/lib/tmdb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mediaType = searchParams.get('mediaType');
  const id = searchParams.get('id');

  if ((mediaType !== 'movie' && mediaType !== 'tv') || !id) {
    return NextResponse.json({ error: 'Invalid TMDB detail request' }, { status: 400 });
  }

  const payload = await getDetailPayload(mediaType as MediaType, id);
  return NextResponse.json(payload);
}
