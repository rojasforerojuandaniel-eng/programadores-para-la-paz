import { parseLocaleAmount } from '~/lib/parse-amount';

describe('parseLocaleAmount', () => {
  it('parses Latin thousands separator (es-CO)', () => {
    expect(parseLocaleAmount('20.000', 'es-CO')).toBe(20000);
    expect(parseLocaleAmount('1.234.567', 'es-CO')).toBe(1234567);
  });

  it('parses Latin decimal comma (es-CO)', () => {
    expect(parseLocaleAmount('1.234,56', 'es-CO')).toBe(1234.56);
    expect(parseLocaleAmount('0,50', 'es-CO')).toBe(0.5);
  });

  it('returns NaN for empty or non-numeric input', () => {
    expect(parseLocaleAmount('', 'es-CO')).toBeNaN();
    expect(parseLocaleAmount('abc', 'es-CO')).toBeNaN();
  });

  it('parses US thousands separator and decimal dot', () => {
    expect(parseLocaleAmount('1,234.56', 'en-US')).toBe(1234.56);
  });

  it('parses raw numbers in any supported locale', () => {
    expect(parseLocaleAmount('25000', 'es-CO')).toBe(25000);
    expect(parseLocaleAmount('25000', 'en-US')).toBe(25000);
  });

  it('rejects negative amounts', () => {
    expect(parseLocaleAmount('-100', 'es-CO')).toBeNaN();
    expect(parseLocaleAmount('-1,234.56', 'en-US')).toBeNaN();
  });
});
