const allowedRemoteHosts = [
  'image.tmdb.org',
  'images.unsplash.com',
  'lh3.googleusercontent.com',
];

const allowedRemoteSuffixes = [
  '.supabase.co',
  '.googleusercontent.com',
];

const tmdbPosterBase = 'https://image.tmdb.org/t/p/w500';
const tmdbBackdropBase = 'https://image.tmdb.org/t/p/original';

export type MovieImageKind = 'poster' | 'backdrop';

export function normalizeMovieImageUrl(src?: string | null, kind: MovieImageKind = 'poster') {
  const value = src?.trim();
  if (!value) return '';

  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('http://')) return value.replace('http://', 'https://');

  if (value.startsWith('/')) {
    const base = kind === 'backdrop' ? tmdbBackdropBase : tmdbPosterBase;
    return `${base}${value}`;
  }

  return value;
}

export function canUseNextImage(src?: string | null) {
  const value = src?.trim();
  if (!value) return false;
  if (value.startsWith('/')) return true;

  try {
    const { protocol, hostname } = new URL(value);
    if (protocol !== 'https:') return false;
    return allowedRemoteHosts.includes(hostname) || allowedRemoteSuffixes.some((suffix) => hostname.endsWith(suffix));
  } catch {
    return false;
  }
}
