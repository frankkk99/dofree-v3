import type { Metadata } from 'next';
import { AdminCatalogBrowser } from '@/components/admin-catalog-browser';

export const metadata: Metadata = {
  title: 'Admin Catalog Browser',
  description: 'DOFree v3 admin catalog browser',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminCatalogBrowser />;
}
