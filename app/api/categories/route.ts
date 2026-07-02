import { NextResponse } from 'next/server';
import { catalogSectionDefs } from '@/lib/catalog-home';
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

const fixedCategories = [
  { slug: 'watch-ready', title: 'พร้อมดู', subtitle: 'รายการที่มีลิงก์พร้อมรับชมแล้ว', sortOrder: 0 },
  { slug: 'random-picks', title: 'สุ่มแนะนำ', subtitle: 'สลับรายการจาก catalog ที่ Sync เข้ามา', sortOrder: 1 },
  { slug: 'coming-soon', title: 'เร็ว ๆ นี้', subtitle: 'หนังและซีรีส์ที่กำลังจะมา', sortOrder: 2 },
];

function fallbackCategories() {
  return [...fixedCategories, ...catalogSectionDefs
    .filter((section) => section.showOnHome !== false)
    .map((section, index) => ({
      slug: section.slug,
      title: section.title,
      subtitle: section.description,
      sortOrder: index + 10,
    }))];
}

export async function GET() {
  const rows = await supabaseRest<CategoryRow[]>(
    'admin_categories?select=slug,title_th,subtitle_th,enabled,sort_order&enabled=eq.true&order=sort_order.asc',
    { mode: 'service', next: { revalidate: 300 } },
  ).catch(() => []);

  const source = rows.length
    ? rows.map((row) => ({
      slug: row.slug,
      title: row.title_th,
      subtitle: row.subtitle_th || null,
      sortOrder: row.sort_order,
    }))
    : fallbackCategories().map((category) => ({
      slug: category.slug,
      title: category.title,
      subtitle: category.subtitle || null,
      sortOrder: category.sortOrder,
    }));

  const categories = source.sort((a, b) => a.sortOrder - b.sortOrder);
  return NextResponse.json({ ok: true, categories }, { headers: CACHE_HEADERS });
}
