import {
  captureException as sentryCaptureException,
  captureMessage as sentryCaptureMessage,
  init as sentryInit,
} from '@sentry/react-native';
import * as SecureStore from 'expo-secure-store';
import { CONSENT_SENTRY_KEY } from './consent';

export const SENTRY_ENABLED_KEY = CONSENT_SENTRY_KEY;

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

  const enabled = sentryCacheExplicitlySet
    ? sentryEnabledCache === true
    : (await SecureStore.getItemAsync(SENTRY_ENABLED_KEY)) === 'true';
  if (!enabled) return;

  sentryInit({
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
  sentryCaptureException(error);
}

export function captureMessage(message: string): void {
  if (!isInitialized) return;
  sentryCaptureMessage(message);
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
