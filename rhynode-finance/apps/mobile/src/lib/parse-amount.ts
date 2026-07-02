export function parseLocaleAmount(value: string, locale: string): number {
  const trimmed = value.trim();
  if (!trimmed) return NaN;

  if (trimmed.startsWith('-')) return NaN;

  const isLatinLocale = /^(es|pt|it|fr|de)/i.test(locale);

  let normalized: string;
  if (isLatinLocale) {
    normalized = trimmed.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = trimmed.replace(/,/g, '');
  }

  const decimalCount = (normalized.match(/\./g) ?? []).length;
  if (decimalCount > 1) return NaN;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return NaN;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
}
