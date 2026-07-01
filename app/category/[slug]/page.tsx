import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CategoryPageClient } from '@/components/category-page-client';
import { getCatalogSectionItems } from '@/lib/catalog-home';
import { baseOpenGraph, indexRobots, safeDescription, siteName } from '@/lib/seo';

type CategoryMeta = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
};

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

const categoryMetas: CategoryMeta[] = [
  { slug: 'coming-soon', eyebrow: 'Coming Soon', title: 'เร็ว ๆ นี้', description: 'รวมภาพยนตร์และซีรีส์ที่กำลังจะเข้าฉายหรือกำลังจะอัปเดต เหมาะสำหรับติดตามรายการใหม่ล่วงหน้า' },
  { slug: 'random-picks', eyebrow: 'Random', title: 'สุ่มแนะนำรอบนี้', description: 'รวมรายการแนะนำแบบสุ่มจาก catalog เพื่อให้ผู้ชมค้นพบหนังและซีรีส์ใหม่ได้ง่ายขึ้น' },
  { slug: 'top-rated', eyebrow: 'คะแนนสูง', title: 'คะแนน 6.5+ น่าดู', description: 'รวมหนังและซีรีส์คะแนนดี คัดจาก catalog เรียงตามคะแนน ความนิยม และคุณภาพของข้อมูล' },
  { slug: 'popular', eyebrow: 'กำลังนิยม', title: 'ยอดนิยมคะแนนดี', description: 'รวมรายการยอดนิยมที่มีคะแนนผ่านเกณฑ์ เหมาะสำหรับผู้ชมที่อยากเลือกเรื่องที่คนสนใจมาก' },
  { slug: 'now-playing', eyebrow: 'มาใหม่', title: 'ภาพยนตร์มาใหม่คะแนนดี', description: 'รวมภาพยนตร์ใหม่และรายการที่เพิ่งอัปเดต เหมาะสำหรับติดตามเรื่องใหม่บนดูดีดี.online' },
  { slug: 'series', eyebrow: 'ซีรีส์', title: 'ซีรีส์น่าติดตาม', description: 'รวมซีรีส์คะแนนดีและซีรีส์ที่เหมาะกับการดูต่อเนื่องในหมวดเดียว' },
  { slug: 'thai', eyebrow: 'Local Focus', title: 'หนังไทยคะแนนดี', description: 'รวมหนังไทยและคอนเทนต์ไทยที่เหมาะกับผู้ชมในประเทศไทยและการค้นหาภาษาไทย' },
  { slug: 'action', eyebrow: 'Action', title: 'แอ็กชัน', description: 'รวมหนังแอ็กชัน หนังบู๊ ภารกิจ การต่อสู้ และเรื่องราวจังหวะเร็ว' },
  { slug: 'adventure', eyebrow: 'Adventure', title: 'ผจญภัย', description: 'รวมหนังผจญภัย การเดินทาง โลกกว้าง และเรื่องราวการค้นพบสิ่งใหม่' },
  { slug: 'animation', eyebrow: 'Animation', title: 'แอนิเมชัน', description: 'รวมหนังแอนิเมชันและคอนเทนต์ภาพเคลื่อนไหวสำหรับผู้ชมหลายวัย' },
  { slug: 'drama', eyebrow: 'Drama', title: 'ดราม่า', description: 'รวมหนังดราม่า เนื้อหาเข้มข้น ตัวละครชัด และเรื่องราวที่เน้นอารมณ์' },
  { slug: 'thriller', eyebrow: 'Thriller', title: 'ระทึกขวัญ', description: 'รวมหนังระทึกขวัญ ลุ้น เข้มข้น และเรื่องราวที่มีแรงกดดันสูง' },
  { slug: 'horror', eyebrow: 'Horror', title: 'สยองขวัญ', description: 'รวมหนังสยองขวัญ หนังผี เรื่องหลอน และคอนเทนต์โทนมืด' },
  { slug: 'comedy', eyebrow: 'Comedy', title: 'คอมเมดี้', description: 'รวมหนังตลก คอมเมดี้ และเรื่องดูง่ายสำหรับพักอารมณ์' },
  { slug: 'sci-fi', eyebrow: 'Sci-Fi', title: 'ไซไฟ', description: 'รวมหนังไซไฟ โลกอนาคต อวกาศ เทคโนโลยี และจินตนาการทางวิทยาศาสตร์' },
  { slug: 'romance', eyebrow: 'Romance', title: 'โรแมนติก', description: 'รวมหนังรัก โรแมนติก ความสัมพันธ์ และเรื่องราวอบอุ่นหัวใจ' },
  { slug: 'fantasy', eyebrow: 'Fantasy', title: 'แฟนตาซี', description: 'รวมหนังแฟนตาซี โลกเหนือจริง เวทมนตร์ ตำนาน และการผจญภัยเหนือจินตนาการ' },
  { slug: 'crime', eyebrow: 'Crime', title: 'อาชญากรรม', description: 'รวมหนังอาชญากรรม สืบสวน คดี ฆาตกรรม และเรื่องราวด้านมืดของสังคม' },
  { slug: 'mystery', eyebrow: 'Mystery', title: 'ลึกลับ', description: 'รวมหนังปริศนา เรื่องลึกลับ ความลับ และการคลี่คลายเหตุการณ์' },
  { slug: 'korea', eyebrow: 'Korea', title: 'หนังเกาหลี', description: 'รวมหนังเกาหลีและคอนเทนต์จากเกาหลีที่คัดตามคะแนนและความน่าสนใจ' },
  { slug: 'japan', eyebrow: 'Japan', title: 'หนังญี่ปุ่น', description: 'รวมหนังญี่ปุ่นและคอนเทนต์จากญี่ปุ่นที่เหมาะสำหรับผู้ชมสายเอเชีย' },
  { slug: 'china', eyebrow: 'China', title: 'หนังจีน', description: 'รวมหนังจีน คอนเทนต์จีน และเรื่องยอดนิยมจากจีน' },
  { slug: 'documentary', eyebrow: 'Documentary', title: 'สารคดี', description: 'รวมสารคดี เรื่องจริง และคอนเทนต์เชิงข้อมูลสำหรับผู้ชมที่ต้องการสาระ' },
];

function decodeSlug(value: string) {
  return decodeURIComponent(value || '').trim();
}

function getCategoryMeta(slug: string) {
  return categoryMetas.find((category) => category.slug === slug) || null;
}

export function generateStaticParams() {
  return categoryMetas.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const category = getCategoryMeta(slug);
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
  const category = getCategoryMeta(slug);
  if (!category) notFound();

  const items = await getCatalogSectionItems(category.slug, 24, 0);

  return <CategoryPageClient slug={category.slug} eyebrow={category.eyebrow} title={category.title} description={category.description} initialItems={items} />;
}
