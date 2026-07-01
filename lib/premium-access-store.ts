import {
  getDefaultPremiumFreeAccessConfig,
  normalizePremiumFreeAccessConfig,
  premiumFreeAccessSettingKey,
  type PremiumFreeAccessConfig,
} from '@/lib/premium-access-config';
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
  if (!row) return getDefaultPremiumFreeAccessConfig();
  return normalizePremiumFreeAccessConfig({
    ...(row.value && typeof row.value === 'object' ? row.value : {}),
    updated_at: row.updated_at || null,
  });
}

export async function readPremiumFreeAccessConfig() {
  if (!hasSupabaseRestConfig('service')) return getDefaultPremiumFreeAccessConfig();

  try {
    const rows = await supabaseRest<SiteSettingRow[]>(
      `site_settings?key=eq.${encodeURIComponent(premiumFreeAccessSettingKey)}&select=key,label,value,updated_at&limit=1`,
      { mode: 'service', cache: 'no-store' },
    );
    return configFromRow(rows?.[0]);
  } catch (error) {
    if (isMissingSettingsTable(error)) return getDefaultPremiumFreeAccessConfig();
    throw error;
  }
}

export async function writePremiumFreeAccessConfig(config: PremiumFreeAccessConfig, _updatedBy?: string | null) {
  const normalized = normalizePremiumFreeAccessConfig(config);
  const rows = await supabaseRest<SiteSettingRow[]>(
    'site_settings?on_conflict=key',
    {
      method: 'POST',
      mode: 'service',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: [{
        key: premiumFreeAccessSettingKey,
        label: 'Premium Free Access Config',
        value: {
          enabled: normalized.enabled,
          label: normalized.label,
          features: normalized.features,
        },
        updated_at: new Date().toISOString(),
      }],
    },
  );

  return configFromRow(rows?.[0]);
}
