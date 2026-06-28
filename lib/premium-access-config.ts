export const premiumAccessFeatures = ['watch', 'favorites', 'history', 'notifications', 'actorClick'] as const;

export type PremiumAccessFeature = (typeof premiumAccessFeatures)[number];

export type PremiumFreeAccessConfig = {
  enabled: boolean;
  label: string;
  features: Record<PremiumAccessFeature, boolean>;
  updated_at?: string | null;
  updated_by?: string | null;
};

export type PremiumAccessUserState = {
  isSignedIn?: boolean;
  isAdmin?: boolean;
  isPremium?: boolean;
  hasPremiumAccess?: boolean;
};

export const premiumFreeAccessSettingKey = 'premium_free_access';
export const defaultPremiumFreeAccessLabel = 'Premium ฟรีช่วงโปร';

export function getDefaultPremiumFreeAccessConfig(): PremiumFreeAccessConfig {
  return {
    enabled: true,
    label: defaultPremiumFreeAccessLabel,
    features: {
      watch: true,
      favorites: true,
      history: true,
      notifications: true,
      actorClick: true,
    },
  };
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

export function normalizePremiumFreeAccessConfig(value?: unknown): PremiumFreeAccessConfig {
  const defaults = getDefaultPremiumFreeAccessConfig();
  if (!value || typeof value !== 'object') return defaults;

  const source = value as Partial<PremiumFreeAccessConfig>;
  const featureSource = source.features && typeof source.features === 'object' ? source.features : {};
  const features = premiumAccessFeatures.reduce((next, feature) => {
    next[feature] = booleanValue((featureSource as Partial<Record<PremiumAccessFeature, unknown>>)[feature], defaults.features[feature]);
    return next;
  }, {} as Record<PremiumAccessFeature, boolean>);

  const label = typeof source.label === 'string' && source.label.trim() ? source.label.trim().slice(0, 80) : defaults.label;

  return {
    enabled: booleanValue(source.enabled, defaults.enabled),
    label,
    features,
    updated_at: typeof source.updated_at === 'string' ? source.updated_at : null,
    updated_by: typeof source.updated_by === 'string' ? source.updated_by : null,
  };
}

export function canUsePremiumFeature(
  feature: PremiumAccessFeature,
  userState: PremiumAccessUserState,
  config: PremiumFreeAccessConfig,
) {
  if (userState.hasPremiumAccess || userState.isPremium || userState.isAdmin) return true;
  return Boolean(config.enabled && config.features[feature]);
}

export function premiumFreeAccessStatus(config: PremiumFreeAccessConfig) {
  if (!config.enabled) return 'off' as const;
  const enabledCount = premiumAccessFeatures.filter((feature) => config.features[feature]).length;
  if (enabledCount === premiumAccessFeatures.length) return 'all' as const;
  if (enabledCount > 0) return 'partial' as const;
  return 'off' as const;
}

