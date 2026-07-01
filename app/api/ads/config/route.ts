import { NextResponse } from 'next/server';
import { publicAdsConfig } from '@/lib/ads-config';
import { readAdsConfig } from '@/lib/ads-store';

export async function GET() {
  const config = await readAdsConfig();
  return NextResponse.json({ ok: true, config: publicAdsConfig(config) });
}
