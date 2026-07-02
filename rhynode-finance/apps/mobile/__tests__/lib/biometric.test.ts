jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

import * as LocalAuthentication from 'expo-local-authentication';
import { authenticateBiometric, isBiometricAvailable } from '~/lib/biometric';

describe('biometric', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isBiometricAvailable', () => {
    it('returns true when compatible hardware is enrolled', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);

      await expect(isBiometricAvailable()).resolves.toBe(true);
    });

    it('returns false when hardware is missing', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);

      await expect(isBiometricAvailable()).resolves.toBe(false);
    });

    it('returns false when no biometry is enrolled', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);

      await expect(isBiometricAvailable()).resolves.toBe(false);
    });

    it('returns false when hardware check throws', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockRejectedValue(new Error('hardware error'));
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);

      await expect(isBiometricAvailable()).resolves.toBe(false);
    });

    it('returns false when enrollment check throws', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockRejectedValue(new Error('enrollment error'));

      await expect(isBiometricAvailable()).resolves.toBe(false);
    });
  });

  describe('authenticateBiometric', () => {
    it('returns false when no biometry is available', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);

      const result = await authenticateBiometric();

      expect(result).toBe(false);
      expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();
    });

    it('returns true when authentication succeeds', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

      const result = await authenticateBiometric({ promptMessage: 'Test prompt' });

      expect(result).toBe(true);
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ promptMessage: 'Test prompt' })
      );
    });

    it('returns false when authentication is cancelled', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: false });

      const result = await authenticateBiometric();

      expect(result).toBe(false);
    });

    it('returns false on unexpected authentication error', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.authenticateAsync as jest.Mock).mockRejectedValue(new Error('sensor failure'));

      const result = await authenticateBiometric();

      expect(result).toBe(false);
    });
  });
});
