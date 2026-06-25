import type { Metadata } from 'next';
import { Inter, Noto_Sans_Thai } from 'next/font/google';
import { seoConfig } from '@/lib/seo';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai'],
  variable: '--font-thai',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(seoConfig.domain),
  applicationName: seoConfig.siteName,
  generator: 'Next.js',
  referrer: 'origin-when-cross-origin',
  title: {
    default: `${seoConfig.siteName} | เว็บดูหนังออนไลน์และซีรีส์ออนไลน์`,
    template: `%s | ${seoConfig.siteName}`,
  },
  description: seoConfig.description,
  keywords: seoConfig.keywords,
  category: 'entertainment',
  alternates: {
    canonical: '/',
    languages: {
      'th-TH': '/',
    },
  },
  openGraph: {
    title: `${seoConfig.siteName} | เว็บดูหนังออนไลน์และซีรีส์ออนไลน์`,
    description: seoConfig.description,
    url: seoConfig.domain,
    siteName: seoConfig.siteName,
    type: 'website',
    locale: seoConfig.locale,
    images: [{ url: '/opengraph-image', alt: seoConfig.siteName }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${seoConfig.siteName} | เว็บดูหนังออนไลน์และซีรีส์ออนไลน์`,
    description: seoConfig.description,
    images: ['/opengraph-image'],
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
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={seoConfig.language} className={`${inter.variable} ${notoSansThai.variable}`}>
      <body>{children}</body>
    </html>
  );
}
