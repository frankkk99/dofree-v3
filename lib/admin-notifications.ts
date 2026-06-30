export type NotificationType =
  | 'general'
  | 'system'
  | 'new_release'
  | 'episode_update'
  | 'premium'
  | 'maintenance'
  | 'help'
  | 'promotion';

export type NotificationAudience = 'all' | 'guest' | 'user' | 'premium' | 'admin';

export type NotificationRow = {
  id: string;
  title: string;
  message: string;
  detail?: string | null;
  type?: NotificationType | string | null;
  priority?: number | null;
  audience?: NotificationAudience | string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  secondary_cta_label?: string | null;
  secondary_cta_url?: string | null;
  image_url?: string | null;
  related_media_type?: 'movie' | 'tv' | string | null;
  related_tmdb_id?: number | null;
  publish_at?: string | null;
  expires_at?: string | null;
  enabled: boolean;
  pinned?: boolean | null;
  sort_order?: number | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export const notificationTypes: NotificationType[] = [
  'general',
  'system',
  'new_release',
  'episode_update',
  'premium',
  'maintenance',
  'help',
  'promotion',
];

export const notificationAudiences: NotificationAudience[] = ['all', 'guest', 'user', 'premium', 'admin'];

export const notificationSelect = [
  'id',
  'title',
  'message',
  'detail',
  'type',
  'priority',
  'audience',
  'cta_label',
  'cta_url',
  'secondary_cta_label',
  'secondary_cta_url',
  'image_url',
  'related_media_type',
  'related_tmdb_id',
  'publish_at',
  'expires_at',
  'enabled',
  'pinned',
  'sort_order',
  'created_by',
  'created_at',
  'updated_at',
].join(',');

export const publicNotificationSelect = [
  'id',
  'title',
  'message',
  'detail',
  'type',
  'priority',
  'audience',
  'cta_label',
  'cta_url',
  'secondary_cta_label',
  'secondary_cta_url',
  'image_url',
  'related_media_type',
  'related_tmdb_id',
  'publish_at',
  'expires_at',
  'pinned',
  'sort_order',
  'updated_at',
].join(',');

export function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalText(value: unknown) {
  const text = cleanText(value);
  return text || null;
}

function parseInteger(value: unknown, fallback: number) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function parseOptionalInteger(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function parseBoolean(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function parseOptionalDate(value: unknown) {
  const text = cleanText(value);
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return 'INVALID_DATE';
  return date.toISOString();
}

function isRelativePath(value: string) {
  return value.startsWith('/') && !value.startsWith('//');
}

export function isSafeActionUrl(value: string | null) {
  if (!value) return true;
  const text = value.trim();
  const lower = text.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return false;
  if (isRelativePath(text)) return true;

  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isSafeImageUrl(value: string | null) {
  if (!value) return true;
  const text = value.trim();
  const lower = text.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return false;
  if (isRelativePath(text)) return true;

  try {
    const url = new URL(text);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function notificationStatus(row: Pick<NotificationRow, 'enabled' | 'publish_at' | 'expires_at'>, now = new Date()) {
  if (!row.enabled) return 'disabled';
  const publishAt = row.publish_at ? new Date(row.publish_at) : null;
  const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
  if (expiresAt && expiresAt.getTime() <= now.getTime()) return 'expired';
  if (publishAt && publishAt.getTime() > now.getTime()) return 'scheduled';
  return 'active';
}

export function isVisibleNotification(row: Pick<NotificationRow, 'enabled' | 'publish_at' | 'expires_at'>, now = new Date()) {
  return notificationStatus(row, now) === 'active';
}

export function sortNotifications(a: NotificationRow, b: NotificationRow) {
  const pinned = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
  if (pinned) return pinned;

  const priority = Number(b.priority || 0) - Number(a.priority || 0);
  if (priority) return priority;

  const sortOrder = Number(a.sort_order || 0) - Number(b.sort_order || 0);
  if (sortOrder) return sortOrder;

  const publish = new Date(b.publish_at || 0).getTime() - new Date(a.publish_at || 0).getTime();
  if (publish) return publish;

  return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
}

export function buildNotificationRecord(body: Record<string, unknown> | null, actorId?: string | null) {
  const title = cleanText(body?.title);
  const message = cleanText(body?.message);
  if (!title) return { error: 'Title is required' };
  if (!message) return { error: 'Message is required' };

  const type = (cleanText(body?.type) || 'general') as NotificationType;
  if (!notificationTypes.includes(type)) return { error: 'Invalid notification type' };

  const audience = (cleanText(body?.audience) || 'all') as NotificationAudience;
  if (!notificationAudiences.includes(audience)) return { error: 'Invalid audience' };

  const ctaUrl = optionalText(body?.cta_url);
  const secondaryCtaUrl = optionalText(body?.secondary_cta_url);
  const imageUrl = optionalText(body?.image_url);

  if (!isSafeActionUrl(ctaUrl)) return { error: 'CTA URL must be a relative path or safe http(s) URL' };
  if (!isSafeActionUrl(secondaryCtaUrl)) return { error: 'Secondary CTA URL must be a relative path or safe http(s) URL' };
  if (!isSafeImageUrl(imageUrl)) return { error: 'Image URL must be a relative path or https URL' };

  const relatedMediaType = optionalText(body?.related_media_type);
  if (relatedMediaType && relatedMediaType !== 'movie' && relatedMediaType !== 'tv') {
    return { error: 'Related media type must be movie or tv' };
  }

  const relatedTmdbId = parseOptionalInteger(body?.related_tmdb_id);
  if (Number.isNaN(relatedTmdbId)) return { error: 'Related TMDB ID must be a number' };

  const publishAt = parseOptionalDate(body?.publish_at);
  if (publishAt === 'INVALID_DATE') return { error: 'Publish at must be a valid date' };

  const expiresAt = parseOptionalDate(body?.expires_at);
  if (expiresAt === 'INVALID_DATE') return { error: 'Expires at must be a valid date' };

  const record: Omit<NotificationRow, 'id'> & { id?: string } = {
    title,
    message,
    detail: optionalText(body?.detail),
    type,
    priority: parseInteger(body?.priority, 0),
    audience,
    cta_label: optionalText(body?.cta_label),
    cta_url: ctaUrl,
    secondary_cta_label: optionalText(body?.secondary_cta_label),
    secondary_cta_url: secondaryCtaUrl,
    image_url: imageUrl,
    related_media_type: relatedMediaType,
    related_tmdb_id: relatedTmdbId,
    publish_at: publishAt,
    expires_at: expiresAt,
    enabled: parseBoolean(body?.enabled, true),
    pinned: parseBoolean(body?.pinned, false),
    sort_order: parseInteger(body?.sort_order, 0),
    updated_at: new Date().toISOString(),
  };

  const id = cleanText(body?.id);
  if (id) record.id = id;
  if (actorId) record.created_by = actorId;

  return { record };
}
