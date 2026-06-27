'use client';

import { AdminCatalogEpisodeCardEnhancer } from './admin-catalog-episode-card-enhancer';
import { AdminCatalogTable } from './admin-catalog-table';
import { AdminImportBar } from './admin-import-bar';

export function AdminCatalogBrowser() {
  return (
    <>
      <AdminCatalogTable />
      <AdminCatalogEpisodeCardEnhancer />
      <AdminImportBar />
    </>
  );
}
