import * as LocalAuthentication from 'expo-local-authentication';

export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync().catch(() => false);
  const enrolled = await LocalAuthentication.isEnrolledAsync().catch(() => false);
  return compatible && enrolled;
}

export async function authenticateBiometric(reason: string): Promise<boolean> {
  const available = await isBiometricAvailable();
  if (!available) return true;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    fallbackLabel: 'Usar PIN',
    disableDeviceFallback: false,
  });

  return result.success;
}
