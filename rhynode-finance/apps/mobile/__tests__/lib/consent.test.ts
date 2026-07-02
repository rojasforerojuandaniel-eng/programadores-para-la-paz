jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';
import {
  getConsentAsync,
  getRawConsentAsync,
  hasConsentDecisionAsync,
  setConsentAsync,
  CONSENT_ANALYTICS_KEY,
} from '~/lib/consent';

describe('consent helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRawConsentAsync', () => {
    it('returns true when stored value is true', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('true');

      await expect(getRawConsentAsync(CONSENT_ANALYTICS_KEY)).resolves.toBe('true');
    });

    it('returns false when stored value is false', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('false');

      await expect(getRawConsentAsync(CONSENT_ANALYTICS_KEY)).resolves.toBe('false');
    });

    it('returns null for unknown values', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('maybe');

      await expect(getRawConsentAsync(CONSENT_ANALYTICS_KEY)).resolves.toBeNull();
    });

    it('returns null when SecureStore fails', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('locked'));

      await expect(getRawConsentAsync(CONSENT_ANALYTICS_KEY)).resolves.toBeNull();
    });
  });

  describe('hasConsentDecisionAsync', () => {
    it('returns true when a value is stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('false');

      await expect(hasConsentDecisionAsync(CONSENT_ANALYTICS_KEY)).resolves.toBe(true);
    });

    it('returns false when no value is stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      await expect(hasConsentDecisionAsync(CONSENT_ANALYTICS_KEY)).resolves.toBe(false);
    });
  });

  describe('getConsentAsync', () => {
    it('returns true for granted consent', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('true');

      await expect(getConsentAsync(CONSENT_ANALYTICS_KEY)).resolves.toBe(true);
    });

    it('returns false for denied consent', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('false');

      await expect(getConsentAsync(CONSENT_ANALYTICS_KEY)).resolves.toBe(false);
    });
  });

  describe('setConsentAsync', () => {
    it('stores true as string true', async () => {
      await setConsentAsync(CONSENT_ANALYTICS_KEY, true);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        CONSENT_ANALYTICS_KEY,
        'true'
      );
    });

    it('stores false as string false', async () => {
      await setConsentAsync(CONSENT_ANALYTICS_KEY, false);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        CONSENT_ANALYTICS_KEY,
        'false'
      );
    });

    it('swallows SecureStore errors', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('locked'));

      await expect(setConsentAsync(CONSENT_ANALYTICS_KEY, true)).resolves.toBeUndefined();
    });
  });
});
