import type { MetadataRoute } from 'next';

const siteUrl = 'https://www.xn--l3caa5kbu.online';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
