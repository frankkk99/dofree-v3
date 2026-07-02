// @ts-nocheck
import { NextResponse } from 'next/server';
import { recordAdminAuditLog } from '@/lib/admin-audit';
import { requireAdminAccess } from '@/lib/admin-auth';
import { catalogSectionDefs } from '@/lib/catalog-home';
import { catalogSectionParams } from '@/lib/catalog-managed-sections';
import { supabaseRest, supabaseRestCount } from '@/lib/supabase-rest';

type CategoryRow = {
  id?: string;
  slug: string;
  title_th: string;
  subtitle_th?: string | null;
  tmdb_path?: string;
  media_type?: string;
  tmdb_params?: Record<string, unknown> | null;
  pages?: number;
  enabled: boolean;
  autoplay?: boolean;
  sort_order: number;
  updated_at?: string;
  card_count?: number;
  visible_card_count?: number;
};

type DefaultCategory = {
  slug: string;
  title_th: string;
  subtitle_th: string;
  sort_order: number;
  media_type: string;
  tmdb_params: Record<string, unknown>;
};

const fixedDefaultCategories: DefaultCategory[] = [
  {
    slug: 'watch-ready',
    title_th: 'แนะนำสำหรับคุณ',
    subtitle_th: 'รายการที่มีลิงก์พร้อมรับชม',
    sort_order: 0,
    media_type: 'movie',
    tmdb_params: { special: 'watch-ready', sourceBuckets: [], languages: [], genreKeywords: [], mediaType: null, minRating: 0, sort: 'recent', eyebrow: 'พร้อมรับชม' },
  },
  {
    slug: 'random-picks',
    title_th: 'สุ่มแนะนำรอบนี้',
    subtitle_th: 'สลับรายการจาก catalog ที่ Sync เข้ามาแล้ว',
    sort_order: 5,
    media_type: 'movie',
    tmdb_params: { special: 'random-picks', sourceBuckets: [], languages: [], genreKeywords: [], mediaType: null, minRating: 6.5, sort: 'score', eyebrow: 'Random' },
  },
];

const defaultCategories: DefaultCategory[] = [
  ...fixedDefaultCategories,
  ...catalogSectionDefs
    .filter((section) => section.showOnHome !== false)
    .map((section, index) => ({
      slug: section.slug,
      title_th: section.title,
      subtitle_th: section.description,
      sort_order: index * 10 + 10,
      media_type: section.mediaType || 'movie',
      tmdb_params: catalogSectionParams(section),
    })),
];

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function slugify(value: unknown) {
  return text(value)?.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function optionalStringArray(source: Record<string, unknown>, key: string, fallback?: string[]) {
  return Array.isArray(source[key]) ? arrayOfStrings(source[key]) : fallback;
}

function mediaTypeValue(value: unknown) {
  return value === 'movie' || value === 'tv' ? value : undefined;
}

function mediaTypeFromParams(params: Record<string, unknown>, rowMediaType?: string, fallback?: string) {
  if (Object.prototype.hasOwnProperty.call(params, 'mediaType')) return mediaTypeValue(params.mediaType);
  return mediaTypeValue(rowMediaType) || mediaTypeValue(fallback);
}

function inList(values: string[]) {
  return values.map((value) => encodeURIComponent(value)).join(',');
}

function paramsForCategory(category: CategoryRow) {
  const defaults = catalogSectionDefs.find((section) => section.slug === category.slug);
  const params = category.tmdb_params || {};
  return {
    special: text(params.special),
    sourceBuckets: optionalStringArray(params, 'sourceBuckets', defaults?.sourceBuckets || [category.slug]) || [],
    languages: optionalStringArray(params, 'languages', defaults?.languages || []) || [],
    mediaType: mediaTypeFromParams(params, category.media_type, defaults?.mediaType),
    minRating: Number.isFinite(Number(params.minRating)) ? Number(params.minRating) : defaults?.minRating,
  };
}

async function admin(request: Request) {
  const auth = await requireAdminAccess(request);
  if (auth.ok === true) return { actor: auth };
  return { response: NextResponse.json({ ok: false, error: auth.error }, { status: auth.status }) };
}

function countPathForCategory(category: CategoryRow, onlyActive = false) {
  const params = paramsForCategory(category);
  const active = onlyActive ? '&is_active=eq.true' : '';

  if (params.special === 'watch-ready' || category.slug === 'watch-ready') return `admin_movie_links?is_active=eq.true&watch_url=not.is.null&select=tmdb_id`;
  if (params.special === 'random-picks' || category.slug === 'random-picks') return `tmdb_catalog?poster_url=not.is.null${active}&select=tmdb_id`;

  const filters = [`select=tmdb_id`];
  if (onlyActive) filters.push('is_active=eq.true');
  if (Number.isFinite(params.minRating)) filters.push(`rating=gte.${params.minRating}`);
  if (params.mediaType) filters.push(`media_type=eq.${params.mediaType}`);
  if (params.sourceBuckets.length === 1) filters.push(`source_bucket=eq.${encodeURIComponent(params.sourceBuckets[0])}`);
  if (params.sourceBuckets.length > 1) filters.push(`source_bucket=in.(${inList(params.sourceBuckets)})`);
  if (!params.sourceBuckets.length && params.languages.length === 1) filters.push(`language=eq.${encodeURIComponent(params.languages[0])}`);
  if (!params.sourceBuckets.length && params.languages.length > 1) filters.push(`language=in.(${inList(params.languages)})`);

  return `tmdb_catalog?${filters.join('&')}`;
}

async function attachCounts(categories: CategoryRow[]) {
  const counted = await Promise.all(categories.map(async (category) => {
    const [cardCount, visibleCardCount] = await Promise.all([
      supabaseRestCount(countPathForCategory(category, false), { mode: 'service' }).catch(() => 0),
      supabaseRestCount(countPathForCategory(category, true), { mode: 'service' }).catch(() => 0),
    ]);
    return { ...category, card_count: cardCount, visible_card_count: visibleCardCount };
  }));
  return counted;
}

async function seedDefaults(request: Request, actor: unknown) {
  const rows = defaultCategories.map((category) => ({
    slug: category.slug,
    title_th: category.title_th,
    subtitle_th: category.subtitle_th,
    tmdb_path: `/${category.slug}`,
    media_type: category.media_type,
    tmdb_params: category.tmdb_params,
    pages: 1,
    enabled: true,
    autoplay: false,
    sort_order: category.sort_order,
  }));
  const saved = await supabaseRest<CategoryRow[]>('admin_categories?on_conflict=slug', { method: 'POST', mode: 'service', prefer: 'resolution=merge-duplicates,return=representation', body: rows });
  await recordAdminAuditLog({ request, actor, action: 'categories.seed_sync_profiles', entityType: 'admin_categories', entityId: 'sync-defaults', afterData: { count: saved.length } });
  return attachCounts(saved);
}

export async function GET(request: Request) {
  const access = await admin(request);
  if (access.response) return access.response;
  const categories = await supabaseRest<CategoryRow[]>('admin_categories?select=id,slug,title_th,subtitle_th,enabled,autoplay,sort_order,media_type,tmdb_params,updated_at&order=sort_order.asc', { mode: 'service' }).catch(() => []);
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
    media_type: mediaTypeValue(body?.media_type) || 'movie',
    tmdb_params: body?.tmdb_params && typeof body.tmdb_params === 'object' ? body.tmdb_params : { sourceBuckets: [slug], languages: [], genreKeywords: [], mediaType: null, minRating: 0, sort: 'popular' },
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
  if (body?.tmdb_params && typeof body.tmdb_params === 'object' && targetSlugs.length === 1) patch.tmdb_params = body.tmdb_params;

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
