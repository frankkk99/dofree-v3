const allowedRemoteHosts = [
  'image.tmdb.org',
  'images.unsplash.com',
  'lh3.googleusercontent.com',
];

const allowedRemoteSuffixes = [
  '.supabase.co',
  '.googleusercontent.com',
];

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
