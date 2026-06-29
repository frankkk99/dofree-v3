'use client';

import { useEffect } from 'react';
import { AdminCatalogEpisodeCardEnhancer } from './admin-catalog-episode-card-enhancer';
import { AdminCatalogTable } from './admin-catalog-table';
import { AdminImportBar } from './admin-import-bar';

function AdminCatalogBulkPasteUiGuard() {
  useEffect(() => {
    function hideBulkPasteControls() {
      document.querySelectorAll('button').forEach((button) => {
        if (button.textContent?.trim() === 'Bulk Paste') {
          button.setAttribute('aria-hidden', 'true');
          button.setAttribute('tabindex', '-1');
          button.classList.add('hidden');
        }
      });

      document.querySelectorAll('h4').forEach((heading) => {
        if (heading.textContent?.includes('เพิ่มหลายตอนในครั้งเดียว')) {
          const panel = heading.closest('.rounded-2xl');
          if (panel instanceof HTMLElement) panel.style.display = 'none';
        }
      });
    }

    hideBulkPasteControls();
    const observer = new MutationObserver(hideBulkPasteControls);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}

export function AdminCatalogBrowser() {
  return (
    <>
      <AdminCatalogBulkPasteUiGuard />
      <AdminCatalogTable />
      <AdminCatalogEpisodeCardEnhancer />
      <AdminImportBar />
    </>
  );
}
