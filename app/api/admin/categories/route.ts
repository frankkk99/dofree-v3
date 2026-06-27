import { NextResponse } from 'next/server';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { requireAdminAccess } from '@/lib/admin-auth';
import { supabaseRest } from '@/lib/supabase-rest';

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
};

const defaultCategories = [
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

async function auth(request: Request) {
  const result = await requireAdminAccess(request);
  if (result.ok === true) return { actor: result };
  return { response: NextResponse.json({ ok: false, error: result.error }, { status: result.status }) };
}

async function seedDefaults(request: Request, actor: Awaited<ReturnType<typeof requireAdminAccess>>) {
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
  return saved;
}

export async function GET(request: Request) {
  const access = await auth(request);
  if (access.response) return access.response;
  const categories = await supabaseRest<CategoryRow[]>('admin_categories?select=id,slug,title_th,subtitle_th,enabled,autoplay,sort_order,updated_at&order=sort_order.asc', { mode: 'service' }).catch(() => []);
  return NextResponse.json({ ok: true, categories });
}

export async function POST(request: Request) {
  const access = await auth(request);
  if (access.response) return access.response;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (body?.seed === true) return NextResponse.json({ ok: true, categories: await seedDefaults(request, access.actor) });

  const slug = text(body?.slug)?.toLowerCase().replace(/[^a-z0-9-]/g, '-');
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
  return NextResponse.json({ ok: true, category: rows[0] });
}

export async function PATCH(request: Request) {
  const access = await auth(request);
  if (access.response) return access.response;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const slug = text(body?.slug);
  if (!slug) return NextResponse.json({ ok: false, error: 'Missing slug' }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const title = text(body?.title_th);
  if (title !== undefined) patch.title_th = title;
  const subtitle = text(body?.subtitle_th);
  if (subtitle !== undefined) patch.subtitle_th = subtitle;
  if (typeof body?.enabled === 'boolean') patch.enabled = body.enabled;
  if (typeof body?.autoplay === 'boolean') patch.autoplay = body.autoplay;
  if (body?.sort_order !== undefined) patch.sort_order = Number(body.sort_order);

  const before = await supabaseRest<CategoryRow[]>(`admin_categories?slug=eq.${encodeURIComponent(slug)}&select=*`, { mode: 'service' }).then((rows) => rows[0]).catch(() => null);
  const rows = await supabaseRest<CategoryRow[]>(`admin_categories?slug=eq.${encodeURIComponent(slug)}`, { method: 'PATCH', mode: 'service', prefer: 'return=representation', body: patch });
  await recordAdminAuditLog({ request, actor: access.actor, action: 'category.patch', entityType: 'admin_categories', entityId: slug, beforeData: before, afterData: rows[0] || patch });
  return NextResponse.json({ ok: true, category: rows[0] });
}
