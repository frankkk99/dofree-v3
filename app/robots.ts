import type { MetadataRoute } from 'next';
import { seoConfig } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/cms/', '/auth/', '/favorites/', '/history/'],
      },
    ],
    sitemap: `${seoConfig.domain}/sitemap.xml`,
    host: seoConfig.domain,
  };
}
