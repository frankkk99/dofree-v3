import type { Metadata } from 'next';
import { Inter, Noto_Sans_Thai } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { AnalyticsTracker } from '@/components/analytics-tracker';
import { BunnyEmbedFix } from '@/components/bunny-embed-fix';
import { baseOpenGraph, defaultKeywords, englishSiteName, indexRobots, siteDescription, siteName, siteUrl } from '@/lib/seo';
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
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: `${siteName} | แพลตฟอร์มค้นหาหนัง ซีรีส์ และอนิเมะ`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: defaultKeywords,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    ...baseOpenGraph('/'),
    title: `${siteName} | แพลตฟอร์มค้นหาหนัง ซีรีส์ และอนิเมะ`,
    description: siteDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} | ${englishSiteName}`,
    description: siteDescription,
  },
  robots: indexRobots(),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th-TH" className={`${inter.variable} ${notoSansThai.variable}`}>
      <body>
        {children}
        <AnalyticsTracker />
        <BunnyEmbedFix />
        <SpeedInsights />
      </body>
    </html>
  );
}
