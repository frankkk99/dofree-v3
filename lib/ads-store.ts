import { adsSettingKey, createDefaultAdsConfig, normalizeAdsConfig, type AdsConfig } from '@/lib/ads-config';
import { hasSupabaseRestConfig, supabaseRest } from '@/lib/supabase-rest';

type SiteSettingRow = {
  key: string;
  label?: string | null;
  value: unknown;
  updated_at?: string | null;
};

function isMissingSettingsTable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return message.includes('PGRST205') || message.includes('site_settings') || message.includes('schema cache');
}

function configFromRow(row?: SiteSettingRow | null) {
  if (!row) return createDefaultAdsConfig();
  return normalizeAdsConfig({
    ...(row.value && typeof row.value === 'object' ? row.value : {}),
    updated_at: row.updated_at || null,
  });
}

export async function readAdsConfig() {
  if (!hasSupabaseRestConfig('service')) return createDefaultAdsConfig();

  try {
    const rows = await supabaseRest<SiteSettingRow[]>(
      `site_settings?key=eq.${encodeURIComponent(adsSettingKey)}&select=key,label,value,updated_at&limit=1`,
      { mode: 'service', cache: 'no-store' },
    );
    return configFromRow(rows?.[0]);
  } catch (error) {
    if (isMissingSettingsTable(error)) return createDefaultAdsConfig();
    throw error;
  }
}

export async function writeAdsConfig(config: AdsConfig, _updatedBy?: string | null) {
  const normalized = normalizeAdsConfig(config);
  const rows = await supabaseRest<SiteSettingRow[]>(
    'site_settings?on_conflict=key',
    {
      method: 'POST',
      mode: 'service',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: [{
        key: adsSettingKey,
        label: 'Owner Ads Config',
        value: {
          enabled: normalized.enabled,
          showPlaceholders: normalized.showPlaceholders,
          contactUrl: normalized.contactUrl,
          slots: normalized.slots,
        },
        updated_at: new Date().toISOString(),
      }],
    },
  );

  return configFromRow(rows?.[0]);
}
