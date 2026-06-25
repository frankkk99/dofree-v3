import type { Metadata } from 'next';

export const seoConfig = {
  siteName: 'ดูดีดี',
  englishSiteName: 'DooDeeDee',
  legacyName: 'DOFree',
  domain: 'https://www.xn--l3caa5kbu.online',
  displayDomain: 'https://www.ดูดีดี.online',
  locale: 'th_TH',
  language: 'th-TH',
  description:
    'ดูดีดี เว็บดูหนังออนไลน์และซีรีส์ออนไลน์ ค้นหาหนังใหม่ หนังไทย หนังฝรั่ง ซีรีส์เกาหลี พากย์ไทย ซับไทย พร้อมข้อมูลเรื่องย่อ คะแนน ตัวอย่าง และรายการพร้อมรับชม',
  keywords: [
    'ดูดีดี',
    'ดูดีดีออนไลน์',
    'DooDeeDee',
    'DOFree',
    'เว็บดูหนังออนไลน์',
    'ดูหนังออนไลน์',
    'หนังออนไลน์',
    'หนังใหม่',
    'ซีรีส์ออนไลน์',
    'ซีรีส์เกาหลี',
    'หนังไทย',
    'หนังฝรั่ง',
    'พากย์ไทย',
    'ซับไทย',
    'หนัง HD',
    'หนังคะแนนสูง',
    'หนังพร้อมดู',
  ],
};

export function absoluteUrl(path = '/') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(cleanPath, seoConfig.domain).toString();
}

export function buildTitle(title?: string) {
  if (!title) return `${seoConfig.siteName} | เว็บดูหนังออนไลน์และซีรีส์ออนไลน์`;
  return `${title} | ${seoConfig.siteName}`;
}

export function canonical(path = '/') {
  return new URL(path, seoConfig.domain);
}

export function publicPageMetadata({
  title,
  description = seoConfig.description,
  path = '/',
  image,
  keywords = [],
}: {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  keywords?: string[];
}): Metadata {
  const fullTitle = title ? buildTitle(title) : buildTitle();
  const url = absoluteUrl(path);

  return {
    title: title || buildTitle(),
    description,
    keywords: [...seoConfig.keywords, ...keywords],
    alternates: {
      canonical: canonical(path),
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: seoConfig.siteName,
      type: 'website',
      locale: seoConfig.locale,
      images: image ? [{ url: image, alt: title || seoConfig.siteName }] : [{ url: '/opengraph-image', alt: seoConfig.siteName }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: image ? [image] : ['/opengraph-image'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
  };
}

export function privatePageMetadata(title: string): Metadata {
  return {
    title,
    robots: {
      index: false,
      follow: false,
    },
  };
}
