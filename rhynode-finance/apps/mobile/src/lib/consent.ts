import * as SecureStore from 'expo-secure-store';

export const CONSENT_ANALYTICS_KEY = '@rhynode/consent-analytics';
export const CONSENT_PUSH_KEY = '@rhynode/consent-push';
export const CONSENT_SENTRY_KEY = '@rhynode/consent-sentry';

export type ConsentKey =
  | typeof CONSENT_ANALYTICS_KEY
  | typeof CONSENT_PUSH_KEY
  | typeof CONSENT_SENTRY_KEY;

export async function getRawConsentAsync(
  key: ConsentKey
): Promise<'true' | 'false' | null> {
  try {
    const value = await SecureStore.getItemAsync(key);
    return value === 'true' ? 'true' : value === 'false' ? 'false' : null;
  } catch {
    return null;
  }
}

export async function hasConsentDecisionAsync(key: ConsentKey): Promise<boolean> {
  const value = await getRawConsentAsync(key);
  return value !== null;
}

export async function getConsentAsync(key: ConsentKey): Promise<boolean> {
  const value = await getRawConsentAsync(key);
  return value === 'true';
}

export async function setConsentAsync(
  key: ConsentKey,
  value: boolean
): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value ? 'true' : 'false');
  } catch {
    // Best-effort: if SecureStore fails (e.g., locked device), we silently
    // skip persisting consent and treat it as denied on next read.
  }
}
