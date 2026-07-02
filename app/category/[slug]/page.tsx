import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CategoryPageClient } from '@/components/category-page-client';
import { getCatalogSectionItems, getCatalogSectionMeta, getCatalogStaticCategoryParams } from '@/lib/catalog-home';
import { baseOpenGraph, indexRobots, safeDescription, siteName } from '@/lib/seo';

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

function decodeSlug(value: string) {
  return decodeURIComponent(value || '').trim();
}

export function generateStaticParams() {
  return [
    { slug: 'coming-soon' },
    { slug: 'random-picks' },
    { slug: 'watch-ready' },
    ...getCatalogStaticCategoryParams(),
  ];
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const category = slug === 'coming-soon'
    ? { slug, eyebrow: 'Coming Soon', title: 'เร็ว ๆ นี้', description: 'รวมภาพยนตร์และซีรีส์ที่กำลังจะเข้าฉายหรือกำลังจะอัปเดต เหมาะสำหรับติดตามรายการใหม่ล่วงหน้า' }
    : slug === 'random-picks'
      ? { slug, eyebrow: 'Random', title: 'สุ่มแนะนำรอบนี้', description: 'รวมรายการแนะนำแบบสุ่มจาก catalog เพื่อให้ผู้ชมค้นพบหนังและซีรีส์ใหม่ได้ง่ายขึ้น' }
      : slug === 'watch-ready'
        ? { slug, eyebrow: 'พร้อมรับชม', title: 'แนะนำสำหรับคุณ', description: 'รวมรายการที่มีลิงก์พร้อมรับชมแล้วจากระบบหลังบ้าน' }
        : getCatalogSectionMeta(slug);
  if (!category) return {};

  const path = `/category/${category.slug}`;
  const description = safeDescription(`${category.description} ดูรายชื่อหนังและซีรีส์ในหมวด ${category.title} บน${siteName}`);

  return {
    title: `${category.title} | หมวดหนังและซีรีส์`,
    description,
    alternates: { canonical: path },
    openGraph: {
      ...baseOpenGraph(path),
      title: `${category.title} | ${siteName}`,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${category.title} | ${siteName}`,
      description,
    },
    robots: indexRobots(),
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const category = slug === 'coming-soon'
    ? { slug, eyebrow: 'Coming Soon', title: 'เร็ว ๆ นี้', description: 'รวมภาพยนตร์และซีรีส์ที่กำลังจะเข้าฉายหรือกำลังจะอัปเดต เหมาะสำหรับติดตามรายการใหม่ล่วงหน้า' }
    : slug === 'random-picks'
      ? { slug, eyebrow: 'Random', title: 'สุ่มแนะนำรอบนี้', description: 'รวมรายการแนะนำแบบสุ่มจาก catalog เพื่อให้ผู้ชมค้นพบหนังและซีรีส์ใหม่ได้ง่ายขึ้น' }
      : slug === 'watch-ready'
        ? { slug, eyebrow: 'พร้อมรับชม', title: 'แนะนำสำหรับคุณ', description: 'รวมรายการที่มีลิงก์พร้อมรับชมแล้วจากระบบหลังบ้าน' }
        : getCatalogSectionMeta(slug);

  if (!category) notFound();

  const items = await getCatalogSectionItems(category.slug, 24, 0);

  return <CategoryPageClient slug={category.slug} eyebrow={category.eyebrow} title={category.title} description={category.description} initialItems={items} />;
}
