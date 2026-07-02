const mockCapture = jest.fn();
const mockOptOut = jest.fn();

jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    capture: mockCapture,
    optOut: mockOptOut,
  })),
}));

jest.mock('~/lib/consent', () => ({
  __esModule: true,
  CONSENT_ANALYTICS_KEY: '@rhynode/consent-analytics',
}));

import * as SecureStore from 'expo-secure-store';
import PostHog from 'posthog-react-native';
import {
  ANALYTICS_ENABLED_KEY,
  resetAnalytics,
  setAnalyticsEnabled,
  isAnalyticsEnabled,
  track,
} from '~/lib/analytics';

describe('Analytics helper', () => {
  const originalKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  const originalHost = process.env.EXPO_PUBLIC_POSTHOG_HOST;

  beforeEach(() => {
    jest.clearAllMocks();
    resetAnalytics();
    setAnalyticsEnabled(false);
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'ph_test_key';
    process.env.EXPO_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com';
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_POSTHOG_KEY = originalKey;
    process.env.EXPO_PUBLIC_POSTHOG_HOST = originalHost;
  });

  it('does not capture when no PostHog key is configured', async () => {
    process.env.EXPO_PUBLIC_POSTHOG_KEY = '';
    setAnalyticsEnabled(true);

    await track('event_name', { foo: 'bar' });

    expect(PostHog).not.toHaveBeenCalled();
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('does not capture when analytics consent is denied', async () => {
    setAnalyticsEnabled(false);

    await track('event_name', { foo: 'bar' });

    expect(PostHog).not.toHaveBeenCalled();
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('initializes PostHog lazily and captures when consent is granted', async () => {
    setAnalyticsEnabled(true);

    await track('button_pressed', { name: 'save' });

    expect(PostHog).toHaveBeenCalledTimes(1);
    expect(PostHog).toHaveBeenCalledWith('ph_test_key', {
      host: 'https://test.posthog.com',
    });
    expect(mockCapture).toHaveBeenCalledWith('button_pressed', { name: 'save' });
  });

  it('reuses the existing PostHog instance for subsequent events', async () => {
    setAnalyticsEnabled(true);

    await track('first_event');
    await track('second_event');

    expect(PostHog).toHaveBeenCalledTimes(1);
    expect(mockCapture).toHaveBeenCalledTimes(2);
    expect(mockCapture).toHaveBeenNthCalledWith(1, 'first_event', undefined);
    expect(mockCapture).toHaveBeenNthCalledWith(2, 'second_event', undefined);
  });

  it('uses the default US host when EXPO_PUBLIC_POSTHOG_HOST is not set', async () => {
    process.env.EXPO_PUBLIC_POSTHOG_HOST = '';
    setAnalyticsEnabled(true);

    await track('default_host_event');

    expect(PostHog).toHaveBeenCalledWith('ph_test_key', {
      host: 'https://us.i.posthog.com',
    });
  });

  describe('setAnalyticsEnabled / isAnalyticsEnabled', () => {
    it('defaults to false before any value is set', () => {
      expect(isAnalyticsEnabled()).toBe(false);
    });

    it('returns true after enabling', () => {
      setAnalyticsEnabled(true);
      expect(isAnalyticsEnabled()).toBe(true);
    });

    it('persists enabled value to SecureStore', () => {
      setAnalyticsEnabled(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        ANALYTICS_ENABLED_KEY,
        'true'
      );
    });

    it('returns false after disabling', () => {
      setAnalyticsEnabled(false);
      expect(isAnalyticsEnabled()).toBe(false);
    });

    it('persists disabled value to SecureStore', () => {
      setAnalyticsEnabled(false);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        ANALYTICS_ENABLED_KEY,
        'false'
      );
    });

    it('opts out of PostHog when disabling after initialization', async () => {
      setAnalyticsEnabled(true);
      await track('test-event');
      expect(PostHog).toHaveBeenCalled();
      setAnalyticsEnabled(false);
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockOptOut).toHaveBeenCalled();
    });
  });
});
