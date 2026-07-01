import { NextResponse } from 'next/server';
import { publicAdsConfig } from '@/lib/ads-config';
import { readAdsConfig } from '@/lib/ads-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = {
  'Cache-Control': 'no-store, max-age=0, must-revalidate',
  Pragma: 'no-cache',
};

export async function GET() {
  const config = await readAdsConfig();
  return NextResponse.json(
    { ok: true, config: publicAdsConfig(config) },
    { headers: noStoreHeaders }
  );
}
