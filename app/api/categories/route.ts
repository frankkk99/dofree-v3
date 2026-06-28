import { NextResponse } from 'next/server';
import { supabaseRest } from '@/lib/supabase-rest';

type CategoryRow = {
  slug: string;
  title_th: string;
  subtitle_th?: string | null;
  enabled: boolean;
  sort_order: number;
};

export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};

export async function GET() {
  const rows = await supabaseRest<CategoryRow[]>(
    'admin_categories?select=slug,title_th,subtitle_th,enabled,sort_order&enabled=eq.true&order=sort_order.asc',
    { mode: 'service', next: { revalidate: 300 } },
  ).catch(() => []);

  const categories = rows.map((row) => ({
    slug: row.slug,
    title: row.title_th,
    subtitle: row.subtitle_th || null,
    sortOrder: row.sort_order,
  }));

  return NextResponse.json({ ok: true, categories }, { headers: CACHE_HEADERS });
}
