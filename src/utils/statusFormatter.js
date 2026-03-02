export const normalizeStatusValue = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_');

export const formatStatusLabel = (value) => {
  const normalized = normalizeStatusValue(value);
  if (!normalized) return '';

  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};
