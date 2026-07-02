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
  { slug: 'watch-ready', title: 'พร้อมดู', subtitle: 'รายการที่พร้อมเปิดรับชมได้ทันที', sortOrder: 0 },
  { slug: 'random-picks', title: 'สุ่มแนะนำ', subtitle: 'เรื่องน่าสนใจที่คัดมาให้ลองดู', sortOrder: 1 },
  { slug: 'coming-soon', title: 'เร็ว ๆ นี้', subtitle: 'หนังและซีรีส์ที่กำลังจะมา', sortOrder: 2 },
];

function cleanPublicText(value?: string | null) {
  const cleaned = (value || '')
    .replace(/tmdb_catalog/gi, '')
    .replace(/TMDB/gi, '')
    .replace(/Sync Profile/gi, '')
    .replace(/Sync/gi, '')
    .replace(/catalog/gi, '')
    .replace(/source_bucket/gi, '')
    .replace(/metadata/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned;
}

function friendlySubtitle(slug: string, fallback?: string | null) {
  if (slug === 'watch-ready') return 'รายการที่พร้อมเปิดรับชมได้ทันที';
  if (slug === 'random-picks') return 'เรื่องน่าสนใจที่คัดมาให้ลองดู';
  if (slug === 'top-rated') return 'เรื่องคะแนนดีที่น่าหยิบมาดู';
  if (slug === 'popular') return 'หนังและซีรีส์ยอดนิยมที่หลายคนกำลังสนใจ';
  if (slug === 'now-playing') return 'หนังใหม่และเรื่องที่กำลังมาแรงช่วงนี้';
  if (slug === 'upcoming') return 'เรื่องใหม่ที่กำลังจะมาให้ติดตาม';
  if (slug === 'popular-series') return 'ซีรีส์น่าดูสำหรับดูต่อเนื่อง';
  if (slug.includes('thai')) return 'หนังและซีรีส์ไทยที่ดูง่ายและใกล้ตัว';
  if (slug.includes('korean')) return 'หนังและซีรีส์เกาหลีที่น่าติดตาม';
  if (slug.includes('anime')) return 'อนิเมะและแอนิเมชันญี่ปุ่นที่น่าติดตาม';
  if (slug.includes('horror')) return 'หนังผี สยองขวัญ และเรื่องชวนลุ้น';
  if (slug.includes('comedy')) return 'หนังตลกและเรื่องดูง่ายไม่เครียด';
  if (slug.includes('romance')) return 'หนังรัก ความสัมพันธ์ และเรื่องอบอุ่นหัวใจ';
  if (slug.includes('family')) return 'รายการสำหรับดูร่วมกันในครอบครัว';
  const cleaned = cleanPublicText(fallback);
  return cleaned || 'คัดเรื่องน่าดูไว้ให้เลือกตามอารมณ์';
}

function fallbackCategories() {
  return [...fixedCategories, ...catalogSectionDefs
    .filter((section) => section.showOnHome !== false)
    .map((section, index) => ({
      slug: section.slug,
      title: cleanPublicText(section.title),
      subtitle: friendlySubtitle(section.slug, section.description),
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
      title: cleanPublicText(row.title_th) || row.slug,
      subtitle: friendlySubtitle(row.slug, row.subtitle_th),
      sortOrder: row.sort_order,
    }))
    : fallbackCategories().map((category) => ({
      slug: category.slug,
      title: cleanPublicText(category.title) || category.slug,
      subtitle: friendlySubtitle(category.slug, category.subtitle),
      sortOrder: category.sortOrder,
    }));

  const categories = source.sort((a, b) => a.sortOrder - b.sortOrder);
  return NextResponse.json({ ok: true, categories }, { headers: CACHE_HEADERS });
}
