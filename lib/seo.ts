import type { Metadata } from 'next';

const siteName = 'DOFree v3';
const defaultDescription = 'DOFree v3 คือเว็บหนังและแพลตฟอร์มคอนเทนต์วิดีโอโทนมืดพรีเมียม สร้างด้วย Next.js พร้อม catalog, SEO, auth-ready และระบบหลังบ้าน';

export function pageMetadata({
  title,
  description = defaultDescription,
  path = '/',
  noIndex = false,
}: {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | ${siteName}`,
      description,
      url: path,
      siteName,
      type: 'website',
      locale: 'th_TH',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteName}`,
      description,
    },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}
