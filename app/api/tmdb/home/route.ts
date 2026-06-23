import { NextResponse } from 'next/server';
import { getHomePayload } from '@/lib/tmdb';

export async function GET() {
  const payload = await getHomePayload();
  return NextResponse.json(payload);
}
