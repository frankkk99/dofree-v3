'use client';

import { AdminCatalogTable } from './admin-catalog-table';
import { AdminImportBar } from './admin-import-bar';

export function AdminCatalogBrowser() {
  return (
    <>
      <AdminCatalogTable />
      <AdminImportBar />
    </>
  );
}
