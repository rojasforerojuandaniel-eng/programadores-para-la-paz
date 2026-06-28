import { formatCurrency, formatDate } from '@rhynode/shared';

describe('@rhynode/shared format helpers', () => {
  describe('formatCurrency', () => {
    it('formats COP with es locale and no decimals', () => {
      const result = formatCurrency(2500000, 'COP', 'es');
      expect(result).toMatch(/\$\s*2\.500\.000/);
    });

    it('formats USD with en locale', () => {
      const result = formatCurrency(1234.5, 'USD', 'en', { maximumFractionDigits: 2 });
      expect(result).toContain('1,234.50');
    });
  });

  describe('formatDate', () => {
    it('formats a date string in es-CO', () => {
      const result = formatDate('2026-06-27', 'es', { day: 'numeric', month: 'long' });
      expect(result.toLowerCase()).toContain('junio');
    });

    it('formats a Date instance in en-US', () => {
      const result = formatDate(new Date(2026, 5, 27), 'en', { day: 'numeric', month: 'short' });
      expect(result.toLowerCase()).toContain('jun');
    });
  });
});
