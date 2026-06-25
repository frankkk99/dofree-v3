import type { Metadata } from 'next';
import { Inter, Noto_Sans_Thai } from 'next/font/google';
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
const siteUrl = 'https://www.xn--l3caa5kbu.online';
const siteDescription = 'ดูดีดี เว็บค้นหาและจัดหมวดคอนเทนต์ภาพยนตร์และซีรีส์ โทนมืดพรีเมียม พร้อมหน้ารายละเอียด ตัวอย่าง และระบบรับชมสำหรับคอนเทนต์ที่มีสิทธิ์เผยแพร่';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: `${siteName} | เว็บดูหนังและซีรีส์ออนไลน์`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [siteName, 'ดูดีดีออนไลน์', 'เว็บดูหนัง', 'ดูหนังออนไลน์', 'ซีรีส์ออนไลน์', 'Movie Website', 'Video Content Platform'],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: `${siteName} | เว็บดูหนังและซีรีส์ออนไลน์`,
    description: siteDescription,
    url: siteUrl,
    siteName,
    type: 'website',
    locale: 'th_TH',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} | เว็บดูหนังและซีรีส์ออนไลน์`,
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
      <body>{children}</body>
    </html>
  );
}
