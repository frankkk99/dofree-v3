import { NextResponse } from 'next/server';
import { readPremiumFreeAccessConfig } from '@/lib/premium-access-store';

export async function GET() {
  const config = await readPremiumFreeAccessConfig();
  return NextResponse.json(
    {
      ok: true,
      config: {
        enabled: config.enabled,
        label: config.label,
        features: config.features,
        updated_at: config.updated_at || null,
      },
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=120',
      },
    },
  );
}

