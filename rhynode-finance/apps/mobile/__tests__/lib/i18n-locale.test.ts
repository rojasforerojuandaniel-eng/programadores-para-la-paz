jest.mock('~/lib/i18n', () => ({
  __esModule: true,
  default: { language: 'es-CO' },
}));

jest.mock('@rhynode/shared', () => ({
  formatCurrency: jest.fn((value: number, currency: string) => `${currency} ${value.toFixed(2)}`),
  formatDate: jest.fn((date: Date | string | number) => `date-${String(date)}`),
}));

import i18n from '~/lib/i18n';
import { currentLocale, localizedFormatCurrency, localizedFormatDate } from '~/lib/i18n-locale';

describe('i18n-locale', () => {
  it('returns es for non-english language', () => {
    (i18n as { language: string }).language = 'es-CO';
    expect(currentLocale()).toBe('es');
  });

  it('returns en for english language', () => {
    (i18n as { language: string }).language = 'en-US';
    expect(currentLocale()).toBe('en');
  });

  it('formats currency using current locale', () => {
    (i18n as { language: string }).language = 'es-CO';
    expect(localizedFormatCurrency(1000, 'COP')).toBe('COP 1000.00');
  });

  it('formats date using current locale and options', () => {
    (i18n as { language: string }).language = 'en-US';
    const date = new Date('2026-01-15');
    expect(localizedFormatDate(date, { dateStyle: 'short' })).toBe(`date-${String(date)}`);
  });
});
