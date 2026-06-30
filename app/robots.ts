import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/movie/', '/tv/', '/watch-ready', '/search'],
        disallow: ['/api/', '/admin/', '/auth', '/watch/', '/membership', '/favorites', '/history', '/notifications'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
