import { NextResponse } from 'next/server';
import { getMediaImagePayload, type MediaType } from '@/lib/tmdb';

const IMAGE_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mediaType = searchParams.get('mediaType');
  const id = searchParams.get('id');

  if ((mediaType !== 'movie' && mediaType !== 'tv') || !id) {
    return NextResponse.json({ ok: false, error: 'Invalid image request' }, { status: 400, headers: IMAGE_CACHE_HEADERS });
  }

  const images = await getMediaImagePayload(mediaType as MediaType, id);
  return NextResponse.json({ ok: true, item: images }, { headers: IMAGE_CACHE_HEADERS });
}
