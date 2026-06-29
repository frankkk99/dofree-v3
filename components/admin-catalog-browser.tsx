'use client';

import { AdminCatalogEpisodeCardEnhancer } from './admin-catalog-episode-card-enhancer';
import { AdminCatalogTable } from './admin-catalog-table';

export function AdminCatalogBrowser() {
  return (
    <>
      <AdminCatalogTable />
      <AdminCatalogEpisodeCardEnhancer />
    </>
  );
}
