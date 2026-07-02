import * as Sentry from '@sentry/react-native';
import * as SecureStore from 'expo-secure-store';

export const SENTRY_ENABLED_KEY = '@rhynode/consent-analytics';

let isInitialized = false;
let sentryEnabledCache: boolean | null = null;
let sentryCacheExplicitlySet = false;

SecureStore.getItemAsync(SENTRY_ENABLED_KEY)
  .then((value) => {
    if (!sentryCacheExplicitlySet) {
      sentryEnabledCache = value === 'true';
    }
  })
  .catch(() => {
    if (!sentryCacheExplicitlySet) {
      sentryEnabledCache = false;
    }
  });

export function isSentryInitialized(): boolean {
  return isInitialized;
}

export function isSentryEnabled(): boolean {
  return sentryEnabledCache ?? false;
}

export async function initSentryAsync(): Promise<void> {
  if (isInitialized) return;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  // Honor any explicit in-memory toggle; otherwise read the persisted value so
  // the first launch after granting consent initializes Sentry correctly.
  const enabled = sentryCacheExplicitlySet
    ? sentryEnabledCache === true
    : (await SecureStore.getItemAsync(SENTRY_ENABLED_KEY)) === 'true';
  if (!enabled) return;

  Sentry.init({
    dsn,
    debug: __DEV__,
    enableNative: true,
  });

  isInitialized = true;
}

export function setSentryEnabled(enabled: boolean): void {
  sentryCacheExplicitlySet = true;
  sentryEnabledCache = enabled;
  void SecureStore.setItemAsync(SENTRY_ENABLED_KEY, enabled ? 'true' : 'false');
  if (!enabled && isInitialized) {
    void closeSentryAsync();
  }
}

export function captureException(error: unknown): void {
  if (!isInitialized) return;
  Sentry.captureException(error);
}

export function captureMessage(message: string): void {
  if (!isInitialized) return;
  Sentry.captureMessage(message);
}

async function closeSentryAsync(): Promise<void> {
  if (!isInitialized) return;

  try {
    const sentryModule = (await import('@sentry/react-native')) as {
      close?: () => Promise<void> | void;
      default?: { close?: () => Promise<void> | void };
    };
    const sentry = sentryModule.default ?? sentryModule;
    if (sentry && typeof sentry.close === 'function') {
      await sentry.close();
    }
  } catch {
    // Sentry SDK is not available; closing is best-effort.
  } finally {
    isInitialized = false;
  }
}
