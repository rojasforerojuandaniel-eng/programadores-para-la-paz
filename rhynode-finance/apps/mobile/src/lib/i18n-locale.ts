import { formatCurrency, formatDate } from '@rhynode/shared';
import type { Locale } from '@rhynode/shared';
import i18n from './i18n';

export function currentLocale(): Locale {
  return i18n.language.startsWith('en') ? 'en' : 'es';
}

export function localizedFormatCurrency(value: number, currency: string): string {
  return formatCurrency(value, currency, currentLocale());
}

export function localizedFormatDate(
  date: Date | string | number,
  opts?: Intl.DateTimeFormatOptions
): string {
  return formatDate(date, currentLocale(), opts);
}
