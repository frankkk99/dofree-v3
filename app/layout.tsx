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

export const metadata: Metadata = {
  metadataBase: new URL('https://dofree-v3.vercel.app'),
  title: {
    default: 'DOFree v3 | Movie Content Platform',
    template: '%s | DOFree v3',
  },
  description: 'DOFree v3 คือเว็บหนังและแพลตฟอร์มคอนเทนต์วิดีโอ โทนมืดพรีเมียม พร้อมโครงสร้างสำหรับ TMDB, SEO และระบบหลังบ้านในอนาคต',
  keywords: ['DOFree', 'เว็บหนัง', 'Movie Website', 'Movie Platform', 'Video Content Platform', 'Next.js'],
  openGraph: {
    title: 'DOFree v3 | Movie Content Platform',
    description: 'เว็บหนังโทนมืดพรีเมียมสำหรับค้นหา จัดหมวด และต่อยอดเป็นแพลตฟอร์มคอนเทนต์เต็มระบบ',
    type: 'website',
    locale: 'th_TH',
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
