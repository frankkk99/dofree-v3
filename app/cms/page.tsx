import type { Metadata } from 'next';
import { privatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = privatePageMetadata('CMS Dashboard');

export default function CmsPage() {
  return <main className="min-h-screen bg-black p-8 text-white">DodeedeeV3 CMS Dashboard</main>;
}
