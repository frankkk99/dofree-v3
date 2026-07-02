export type ParsedYouTubeUrl = {
  videoId: string;
  embedUrl: string;
  thumbnailUrl: string;
  originalUrl: string;
};

const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{6,20}$/;
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

function normalizeInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function cleanVideoId(value: string | null | undefined) {
  if (!value) return null;
  const candidate = value.trim().split(/[?&#/]/)[0];
  return VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
}

function extractVideoId(url: URL) {
  const host = url.hostname.toLowerCase().replace(/^www\./, 'www.');
  if (!YOUTUBE_HOSTS.has(host)) return null;

  if (host === 'youtu.be' || host === 'www.youtu.be') {
    return cleanVideoId(url.pathname.split('/').filter(Boolean)[0]);
  }

  const watchId = cleanVideoId(url.searchParams.get('v'));
  if (watchId) return watchId;

  const parts = url.pathname.split('/').filter(Boolean);
  const markerIndex = parts.findIndex((part) => ['shorts', 'embed', 'live', 'v'].includes(part));
  if (markerIndex >= 0) return cleanVideoId(parts[markerIndex + 1]);

  return null;
}

export function parseYouTubeUrl(input: string): ParsedYouTubeUrl | null {
  const normalized = normalizeInput(input);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    const videoId = extractVideoId(url);
    if (!videoId) return null;

    return {
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      originalUrl: normalized,
    };
  } catch {
    return null;
  }
}

export function isYouTubeUrl(input: string) {
  return parseYouTubeUrl(input) !== null;
}
