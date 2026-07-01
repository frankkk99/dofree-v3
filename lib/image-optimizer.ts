export function canUseNextImage(src?: string | null) {
  const value = src?.trim();
  if (!value) return false;
  if (value.startsWith('/')) return true;
  return false;
}
