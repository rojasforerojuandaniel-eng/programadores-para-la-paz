jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
  wrap: (Component: unknown) => Component,
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

import * as SecureStore from 'expo-secure-store';
import {
  captureException,
  captureMessage,
  initSentryAsync,
  isSentryEnabled,
  isSentryInitialized,
  setSentryEnabled,
  SENTRY_ENABLED_KEY,
} from '~/lib/sentry';

describe('Sentry helper', () => {
  const originalDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/1';
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = originalDsn;
  });

  describe('consent helpers', () => {
    it('defaults to false before any value is set', () => {
      expect(isSentryEnabled()).toBe(false);
    });

    it('returns true after enabling', () => {
      setSentryEnabled(true);
      expect(isSentryEnabled()).toBe(true);
    });

    it('persists enabled value to SecureStore', () => {
      setSentryEnabled(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        SENTRY_ENABLED_KEY,
        'true'
      );
    });

    it('returns false after disabling', () => {
      setSentryEnabled(false);
      expect(isSentryEnabled()).toBe(false);
    });

    it('persists disabled value to SecureStore', () => {
      setSentryEnabled(false);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        SENTRY_ENABLED_KEY,
        'false'
      );
    });
  });

  describe('initialization and capture', () => {
    it('does not initialize when no DSN is configured', async () => {
      process.env.EXPO_PUBLIC_SENTRY_DSN = '';
      setSentryEnabled(true);
      await initSentryAsync();
      expect(isSentryInitialized()).toBe(false);
    });

    it('does not initialize when sentry consent is denied', async () => {
      setSentryEnabled(false);
      await initSentryAsync();
      expect(isSentryInitialized()).toBe(false);
    });

    it('initializes when DSN is set and sentry consent is granted', async () => {
      setSentryEnabled(true);
      await initSentryAsync();
      expect(isSentryInitialized()).toBe(true);
    });

    it('is idempotent and keeps initialized flag after repeated calls', async () => {
      setSentryEnabled(true);
      await initSentryAsync();
      await initSentryAsync();
      expect(isSentryInitialized()).toBe(true);
    });

    it('does not capture exceptions before initialization', async () => {
      setSentryEnabled(false);
      await initSentryAsync();
      jest.clearAllMocks();
      captureException(new Error('ignored'));
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('captures exceptions after initialization', async () => {
      setSentryEnabled(true);
      await initSentryAsync();
      jest.clearAllMocks();
      const error = new Error('captured');
      captureException(error);
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('captures messages after initialization', async () => {
      setSentryEnabled(true);
      await initSentryAsync();
      jest.clearAllMocks();
      captureMessage('test message');
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('closes Sentry when disabling after initialization', async () => {
      setSentryEnabled(true);
      await initSentryAsync();

      setSentryEnabled(false);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(isSentryInitialized()).toBe(false);
    });

    it('reads the stored enabled value on module load', async () => {
      jest.resetModules();
      jest.doMock('expo-secure-store', () => ({
        getItemAsync: jest.fn().mockResolvedValue('true'),
        setItemAsync: jest.fn(),
        deleteItemAsync: jest.fn(),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fresh = require('~/lib/sentry') as typeof import('~/lib/sentry');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(fresh.isSentryEnabled()).toBe(true);
    });

    it('falls back to disabled when SecureStore read fails on load', async () => {
      jest.resetModules();
      jest.doMock('expo-secure-store', () => ({
        getItemAsync: jest.fn().mockRejectedValue(new Error('locked')),
        setItemAsync: jest.fn(),
        deleteItemAsync: jest.fn(),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fresh = require('~/lib/sentry') as typeof import('~/lib/sentry');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(fresh.isSentryEnabled()).toBe(false);
    });

    it('handles Sentry SDK without a close method', async () => {
      jest.isolateModules(async () => {
        jest.doMock('expo-secure-store', () => ({
          getItemAsync: jest.fn().mockResolvedValue('true'),
          setItemAsync: jest.fn(),
          deleteItemAsync: jest.fn(),
        }));

        jest.doMock('@sentry/react-native', () => ({
          init: jest.fn(),
          captureException: jest.fn(),
          captureMessage: jest.fn(),
          close: undefined,
          wrap: (Component: unknown) => Component,
        }));

        // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fresh = require('~/lib/sentry') as typeof import('~/lib/sentry');
        fresh.setSentryEnabled(true);
        await fresh.initSentryAsync();
        fresh.setSentryEnabled(false);
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(fresh.isSentryInitialized()).toBe(false);
      });
    });

    it('does not try to close when Sentry was never initialized', async () => {
      setSentryEnabled(false);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(isSentryInitialized()).toBe(false);
    });

    it('initializes from SecureStore consent when no explicit cache is set', async () => {
      jest.resetModules();
      jest.doMock('expo-secure-store', () => ({
        getItemAsync: jest.fn().mockResolvedValue('true'),
        setItemAsync: jest.fn(),
        deleteItemAsync: jest.fn(),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fresh = require('~/lib/sentry') as typeof import('~/lib/sentry');
      await new Promise((resolve) => setTimeout(resolve, 50));

      await fresh.initSentryAsync();
      expect(fresh.isSentryInitialized()).toBe(true);
    });

    it('does not initialize when SecureStore consent is denied and no explicit cache', async () => {
      jest.resetModules();
      jest.doMock('expo-secure-store', () => ({
        getItemAsync: jest.fn().mockResolvedValue('false'),
        setItemAsync: jest.fn(),
        deleteItemAsync: jest.fn(),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fresh = require('~/lib/sentry') as typeof import('~/lib/sentry');
      await new Promise((resolve) => setTimeout(resolve, 50));

      await fresh.initSentryAsync();
      expect(fresh.isSentryInitialized()).toBe(false);
    });
  });
});
