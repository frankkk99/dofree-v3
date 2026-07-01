import type { Metadata } from 'next';

export const siteUrl = 'https://www.xn--l3caa5kbu.online';
export const siteName = 'ดูดีดี.online';
export const shortSiteName = 'ดูดีดี';
export const englishSiteName = 'DooDeeDee.online';

export const siteDescription =
  'ดูดีดี.online แพลตฟอร์มค้นหาและจัดหมวดหมู่ภาพยนตร์ ซีรีส์ อนิเมะ และคอนเทนต์ยอดนิยม พร้อมข้อมูลเรื่องย่อ นักแสดง ตัวอย่าง รายการแนะนำ และสถานะพร้อมรับชม';

export const defaultKeywords = [
  siteName,
  shortSiteName,
  englishSiteName,
  'ดูดีดีออนไลน์',
  'ดูหนัง',
  'ดูหนังออนไลน์',
  'ซีรีส์',
  'ซีรีส์ออนไลน์',
  'อนิเมะ',
  'หนังใหม่',
  'หนังพร้อมรับชม',
  'เรื่องย่อหนัง',
  'ตัวอย่างหนัง',
  'นักแสดง',
];

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function safePathSegment(value: string | number) {
  return encodeURIComponent(String(value).trim()).replace(/%2F/gi, '-');
}

export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalized, siteUrl).toString();
}

export function safeDescription(text?: string | null, fallback = siteDescription, maxLength = 158) {
  const source = (text || fallback).replace(/\s+/g, ' ').trim();
  if (source.length <= maxLength) return source;
  return `${source.slice(0, maxLength - 1).trim()}…`;
}

export function buildTitle(title?: string | null) {
  const cleanTitle = title?.replace(/\s+/g, ' ').trim();
  return cleanTitle ? `${cleanTitle} | ${siteName}` : siteName;
}

export function buildOgImages(...images: Array<string | null | undefined>): NonNullable<Metadata['openGraph']>['images'] {
  const urls = images.filter(Boolean).map((image) => absoluteUrl(String(image)));
  return urls.length ? urls.map((url) => ({ url })) : undefined;
}

export function seoSlug(title: string) {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function mediaIdFromSlug(value: string | number) {
  const decoded = safeDecodeURIComponent(String(value).trim());
  const match = decoded.match(/^(\d+)/);
  return match?.[1] || '';
}

export function mediaSlugFromPath(value: string | number) {
  return safeDecodeURIComponent(String(value).trim());
}

export function mediaDetailPath(mediaType: 'movie' | 'tv', id: string | number, title?: string | null, hash = '') {
  const numericId = mediaIdFromSlug(id);
  const titleSlug = seoSlug(title || '') || 'detail';
  const rawSegment = `${numericId || id}-${titleSlug}`;
  const suffix = hash ? (hash.startsWith('#') ? hash : `#${hash}`) : '';
  return `/${mediaType}/${safePathSegment(rawSegment)}${suffix}`;
}

export function indexRobots(): Metadata['robots'] {
  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  };
}

export function noindexRobots(follow = false): Metadata['robots'] {
  return {
    index: false,
    follow,
    googleBot: {
      index: false,
      follow,
      noimageindex: true,
    },
  };
}

export function baseOpenGraph(path = '/'): NonNullable<Metadata['openGraph']> {
  return {
    type: 'website',
    locale: 'th_TH',
    url: absoluteUrl(path),
    siteName,
  };
}
