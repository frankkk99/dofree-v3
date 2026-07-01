// @ts-nocheck
import { NextResponse } from 'next/server';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { requireAdminAccess } from '@/lib/admin-auth';
import { supabaseRest, supabaseRestCount } from '@/lib/supabase-rest';

type CategoryRow = {
  id?: string;
  slug: string;
  title_th: string;
  subtitle_th?: string | null;
  tmdb_path?: string;
  media_type?: string;
  tmdb_params?: Record<string, unknown>;
  pages?: number;
  enabled: boolean;
  autoplay?: boolean;
  sort_order: number;
  updated_at?: string;
  card_count?: number;
  visible_card_count?: number;
};

type DefaultCategory = [string, string, string, number];
const defaultCategories: DefaultCategory[] = [
  ['watch-ready', 'แนะนำสำหรับคุณ', 'พร้อมรับชม', 0],
  ['top-rated', 'คะแนน 6.5+ น่าดู', 'คะแนนสูง', 10],
  ['popular', 'ยอดนิยมคะแนนดี', 'กำลังนิยม', 20],
  ['now-playing', 'ภาพยนตร์มาใหม่คะแนนดี', 'มาใหม่', 30],
  ['series', 'ซีรีส์น่าติดตาม', 'ซีรีส์', 40],
  ['thai', 'หนังไทยคะแนนดี', 'Local Focus', 50],
  ['action', 'แอ็กชัน', 'Action', 60],
  ['adventure', 'ผจญภัย', 'Adventure', 70],
  ['animation', 'แอนิเมชัน', 'Animation', 80],
  ['drama', 'ดราม่า', 'Drama', 90],
  ['thriller', 'ระทึกขวัญ', 'Thriller', 100],
  ['horror', 'สยองขวัญ', 'Horror', 110],
  ['comedy', 'คอมเมดี้', 'Comedy', 120],
  ['sci-fi', 'ไซไฟ', 'Sci-Fi', 130],
  ['romance', 'โรแมนติก', 'Romance', 140],
  ['fantasy', 'แฟนตาซี', 'Fantasy', 150],
  ['crime', 'อาชญากรรม', 'Crime', 160],
  ['mystery', 'ลึกลับ', 'Mystery', 170],
  ['korea', 'หนังเกาหลี', 'Korea', 180],
  ['japan', 'หนังญี่ปุ่น', 'Japan', 190],
  ['china', 'หนังจีน', 'China', 200],
  ['documentary', 'สารคดี', 'Documentary', 210],
];

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function slugify(value: unknown) {
  return text(value)?.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

async function admin(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === true) return { actor: auth };
  return { response: NextResponse.json({ ok: false, error: auth.error }, { status: auth.status }) };
}

async function attachCounts(categories: CategoryRow[]) {
  const counted = await Promise.all(categories.map(async (category) => {
    const encodedSlug = encodeURIComponent(category.slug);
    const [cardCount, visibleCardCount] = await Promise.all([
      supabaseRestCount(`tmdb_catalog?source_bucket=eq.${encodedSlug}`, { mode: 'service' }).catch(() => 0),
      supabaseRestCount(`tmdb_catalog?source_bucket=eq.${encodedSlug}&is_active=eq.true`, { mode: 'service' }).catch(() => 0),
    ]);
    return { ...category, card_count: cardCount, visible_card_count: visibleCardCount };
  }));
  return counted;
}

async function seedDefaults(request: Request, actor: unknown) {
  const rows = defaultCategories.map(([slug, title, subtitle, order]) => ({
    slug,
    title_th: title,
    subtitle_th: subtitle,
    tmdb_path: `/${slug}`,
    media_type: slug === 'series' ? 'tv' : 'movie',
    tmdb_params: {},
    pages: 1,
    enabled: true,
    autoplay: false,
    sort_order: order,
  }));
  const saved = await supabaseRest<CategoryRow[]>('admin_categories?on_conflict=slug', { method: 'POST', mode: 'service', prefer: 'resolution=merge-duplicates,return=representation', body: rows });
  await recordAdminAuditLog({ request, actor, action: 'categories.seed', entityType: 'admin_categories', entityId: 'defaults', afterData: { count: saved.length } });
  return attachCounts(saved);
}

export async function GET(request: Request) {
  const access = await admin(request);
  if (access.response) return access.response;
  const categories = await supabaseRest<CategoryRow[]>('admin_categories?select=id,slug,title_th,subtitle_th,enabled,autoplay,sort_order,updated_at&order=sort_order.asc', { mode: 'service' }).catch(() => []);
  return NextResponse.json({ ok: true, categories: await attachCounts(categories) });
}

export async function POST(request: Request) {
  const access = await admin(request);
  if (access.response) return access.response;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (body?.seed === true) return NextResponse.json({ ok: true, categories: await seedDefaults(request, access.actor) });

  const slug = slugify(body?.slug);
  const title = text(body?.title_th);
  if (!slug || !title) return NextResponse.json({ ok: false, error: 'ต้องมี slug และชื่อหมวด' }, { status: 400 });

  const record = {
    slug,
    title_th: title,
    subtitle_th: text(body?.subtitle_th) || null,
    tmdb_path: text(body?.tmdb_path) || `/${slug}`,
    media_type: text(body?.media_type) || 'movie',
    tmdb_params: {},
    pages: Number(body?.pages || 1),
    enabled: body?.enabled !== false,
    autoplay: Boolean(body?.autoplay),
    sort_order: Number(body?.sort_order || 999),
  };
  const rows = await supabaseRest<CategoryRow[]>('admin_categories?on_conflict=slug', { method: 'POST', mode: 'service', prefer: 'resolution=merge-duplicates,return=representation', body: [record] });
  await recordAdminAuditLog({ request, actor: access.actor, action: 'category.upsert', entityType: 'admin_categories', entityId: slug, afterData: rows[0] });
  return NextResponse.json({ ok: true, category: (await attachCounts(rows))[0] });
}

export async function PATCH(request: Request) {
  const access = await admin(request);
  if (access.response) return access.response;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const slugs = Array.isArray(body?.slugs) ? body.slugs.map(slugify).filter(Boolean) : [];
  const singleSlug = slugify(body?.slug);
  const targetSlugs = slugs.length ? slugs : singleSlug ? [singleSlug] : [];
  if (!targetSlugs.length) return NextResponse.json({ ok: false, error: 'Missing slug' }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const title = text(body?.title_th);
  if (title !== undefined && targetSlugs.length === 1) patch.title_th = title;
  const subtitle = text(body?.subtitle_th);
  if (subtitle !== undefined && targetSlugs.length === 1) patch.subtitle_th = subtitle;
  if (typeof body?.enabled === 'boolean') patch.enabled = body.enabled;
  if (typeof body?.autoplay === 'boolean') patch.autoplay = body.autoplay;
  if (body?.sort_order !== undefined && targetSlugs.length === 1) patch.sort_order = Number(body.sort_order);

  const path = targetSlugs.length === 1
    ? `admin_categories?slug=eq.${encodeURIComponent(targetSlugs[0])}`
    : `admin_categories?slug=in.(${targetSlugs.join(',')})`;
  const rows = await supabaseRest<CategoryRow[]>(path, { method: 'PATCH', mode: 'service', prefer: 'return=representation', body: patch });
  await recordAdminAuditLog({ request, actor: access.actor, action: targetSlugs.length > 1 ? 'categories.bulk_patch' : 'category.patch', entityType: 'admin_categories', entityId: targetSlugs.join(','), afterData: { patch, count: rows?.length || 0 } });
  return NextResponse.json({ ok: true, categories: await attachCounts(rows || []) });
}

export async function DELETE(request: Request) {
  const access = await admin(request);
  if (access.response) return access.response;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const slugs = Array.isArray(body?.slugs) ? body.slugs.map(slugify).filter(Boolean) : [];
  const singleSlug = slugify(body?.slug);
  const targetSlugs = slugs.length ? slugs : singleSlug ? [singleSlug] : [];
  if (!targetSlugs.length) return NextResponse.json({ ok: false, error: 'Missing slug' }, { status: 400 });

  for (const slug of targetSlugs) {
    await supabaseRest(`tmdb_catalog?source_bucket=eq.${encodeURIComponent(slug)}`, { method: 'PATCH', mode: 'service', body: { source_bucket: null, updated_at: new Date().toISOString() } }).catch(() => null);
  }
  const path = targetSlugs.length === 1
    ? `admin_categories?slug=eq.${encodeURIComponent(targetSlugs[0])}`
    : `admin_categories?slug=in.(${targetSlugs.join(',')})`;
  const deleted = await supabaseRest<CategoryRow[]>(path, { method: 'DELETE', mode: 'service', prefer: 'return=representation' });
  await recordAdminAuditLog({ request, actor: access.actor, action: 'categories.delete', entityType: 'admin_categories', entityId: targetSlugs.join(','), afterData: { deleted: deleted?.length || 0, slugs: targetSlugs } });
  return NextResponse.json({ ok: true, deleted: deleted || [], slugs: targetSlugs });
}
