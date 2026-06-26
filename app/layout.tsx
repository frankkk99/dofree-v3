import type { Metadata } from 'next';
import { Inter, Noto_Sans_Thai } from 'next/font/google';
import { AnalyticsTracker } from '@/components/analytics-tracker';
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

const siteName = 'ดูดีดี';
const englishSiteName = 'DodeedeeV3';
const siteUrl = 'https://www.xn--l3caa5kbu.online';
const siteDescription = 'ดูดีดี (DodeedeeV3) เว็บค้นหาและจัดหมวดคอนเทนต์ภาพยนตร์และซีรีส์ โทนมืดพรีเมียม พร้อมหน้ารายละเอียด ตัวอย่าง และระบบรับชมสำหรับคอนเทนต์ที่มีสิทธิ์เผยแพร่';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: `${siteName} | ${englishSiteName} | เว็บดูหนังและซีรีส์ออนไลน์`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [siteName, englishSiteName, 'ดูดีดีออนไลน์', 'Dodeedee', 'Dodeedee online', 'เว็บดูหนัง', 'ดูหนังออนไลน์', 'ซีรีส์ออนไลน์', 'Movie Website', 'Video Content Platform'],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: `${siteName} | ${englishSiteName} | เว็บดูหนังและซีรีส์ออนไลน์`,
    description: siteDescription,
    url: siteUrl,
    siteName,
    type: 'website',
    locale: 'th_TH',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} | ${englishSiteName} | เว็บดูหนังและซีรีส์ออนไลน์`,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th-TH" className={`${inter.variable} ${notoSansThai.variable}`}>
      <body>
        {children}
        <AnalyticsTracker />
      </body>
    </html>
  );
}
