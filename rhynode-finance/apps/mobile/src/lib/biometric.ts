import * as LocalAuthentication from 'expo-local-authentication';
import i18n from '~/lib/i18n';

export const BIOMETRIC_ENABLED_KEY = '@rhynode/biometric-enabled';

export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync().catch(() => false);
  const enrolled = await LocalAuthentication.isEnrolledAsync().catch(() => false);
  return compatible && enrolled;
}

export interface AuthenticateBiometricOptions {
  promptMessage?: string;
  fallbackLabel?: string;
  disableDeviceCredentials?: boolean;
}

export async function authenticateBiometric({
  promptMessage = i18n.t('auth.biometric.promptMessage'),
  fallbackLabel = i18n.t('auth.biometric.fallbackPin'),
  disableDeviceCredentials = false,
}: AuthenticateBiometricOptions = {}): Promise<boolean> {
  const available = await isBiometricAvailable();
  if (!available) return true;

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel,
      disableDeviceFallback: disableDeviceCredentials,
    });
    return result.success;
  } catch {
    return false;
  }
}
