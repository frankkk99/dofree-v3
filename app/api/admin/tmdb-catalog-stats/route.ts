import { NextResponse } from 'next/server';
import { requireAdminToken } from '@/lib/admin-auth';
import { supabaseRest } from '@/lib/supabase-rest';

type TotalRow = { total: number | string };
type BucketRow = {
  source_bucket: string | null;
  total: number | string;
  avg_rating: number | string | null;
  max_rating: number | string | null;
};

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = requireAdminToken(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const [totalRows, bucketRows] = await Promise.all([
      supabaseRest<TotalRow[]>('rpc/tmdb_catalog_total_stats', {
        method: 'POST',
        mode: 'service',
        body: {},
      }),
      supabaseRest<BucketRow[]>('rpc/tmdb_catalog_bucket_stats', {
        method: 'POST',
        mode: 'service',
        body: {},
      }),
    ]);

    const total = Number(totalRows?.[0]?.total || 0);
    const buckets = bucketRows.map((row) => ({
      source_bucket: row.source_bucket || 'unknown',
      total: Number(row.total || 0),
      avg_rating: Number(row.avg_rating || 0),
      max_rating: Number(row.max_rating || 0),
    }));

    return NextResponse.json({ ok: true, total, buckets });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Cannot load TMDB catalog stats' }, { status: 500 });
  }
}
