jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationHandler: jest.fn(),
  AndroidImportance: { DEFAULT: 'default' },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('~/lib/i18n', () => ({
  __esModule: true,
  default: { t: jest.fn((key: string) => key), language: 'es-CO' },
}));

jest.mock('~/lib/api', () => ({
  createApiClient: jest.fn(() => ({
    post: jest.fn().mockResolvedValue({ ok: true }),
  })),
}));

import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createApiClient } from '~/lib/api';
import {
  getPushConsentAsync,
  setPushConsentAsync,
  requestPushPermissionsAsync,
  registerPushTokenAsync,
  setupNotificationListeners,
  PUSH_CONSENT_KEY,
} from '~/lib/notifications';

const mockedCreateApiClient = createApiClient as jest.Mock;

const mockedGetPermissionsAsync = Notifications.getPermissionsAsync as jest.Mock;
const mockedRequestPermissionsAsync = Notifications.requestPermissionsAsync as jest.Mock;
const mockedGetExpoPushTokenAsync = Notifications.getExpoPushTokenAsync as jest.Mock;

describe('notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockedRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockedGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[test]' });
  });

  describe('push consent', () => {
    it('returns granted consent', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('granted');

      await expect(getPushConsentAsync()).resolves.toBe('granted');
    });

    it('returns denied consent', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('denied');

      await expect(getPushConsentAsync()).resolves.toBe('denied');
    });

    it('returns null for unknown values', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('maybe');

      await expect(getPushConsentAsync()).resolves.toBeNull();
    });

    it('deletes the key when setting null', async () => {
      await setPushConsentAsync(null);

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(PUSH_CONSENT_KEY);
    });

    it('stores granted consent', async () => {
      await setPushConsentAsync('granted');

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(PUSH_CONSENT_KEY, 'granted');
    });
  });

  describe('requestPushPermissionsAsync', () => {
    it('returns true when already granted', async () => {
      const result = await requestPushPermissionsAsync();

      expect(result).toBe(true);
      expect(mockedRequestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('requests permissions when not yet granted', async () => {
      mockedGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });

      const result = await requestPushPermissionsAsync();

      expect(result).toBe(true);
      expect(mockedRequestPermissionsAsync).toHaveBeenCalled();
    });

    it('returns false when permission is denied', async () => {
      mockedGetPermissionsAsync.mockResolvedValue({ status: 'denied' });
      mockedRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });

      const result = await requestPushPermissionsAsync();

      expect(result).toBe(false);
    });

    it('continues when channel setup fails', async () => {
      mockedGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
      Notifications.setNotificationChannelAsync.mockRejectedValue(new Error('channel error'));

      const result = await requestPushPermissionsAsync();

      expect(result).toBe(true);
    });
  });

  describe('registerPushTokenAsync', () => {
    it('registers token when push is enabled and consent granted', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('granted');

      await registerPushTokenAsync(jest.fn().mockResolvedValue('jwt'));

      expect(mockedGetExpoPushTokenAsync).toHaveBeenCalled();
    });

    it('skips registration when push is disabled', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('false');

      await registerPushTokenAsync(jest.fn().mockResolvedValue('jwt'));

      expect(mockedGetExpoPushTokenAsync).not.toHaveBeenCalled();
    });

    it('skips registration when consent is denied', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('denied');

      await registerPushTokenAsync(jest.fn().mockResolvedValue('jwt'));

      expect(mockedGetExpoPushTokenAsync).not.toHaveBeenCalled();
    });

    it('skips registration when permissions are denied', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('granted');
      mockedGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
      mockedRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });

      await registerPushTokenAsync(jest.fn().mockResolvedValue('jwt'));

      expect(mockedGetExpoPushTokenAsync).not.toHaveBeenCalled();
    });

    it('skips when no token data is returned', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('granted');
      mockedGetExpoPushTokenAsync.mockResolvedValue({ data: null });

      await registerPushTokenAsync(jest.fn().mockResolvedValue('jwt'));

      expect(mockedCreateApiClient).not.toHaveBeenCalled();
    });

    it('skips when JWT is unavailable', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('granted');

      await registerPushTokenAsync(jest.fn().mockResolvedValue(null));

      expect(mockedCreateApiClient).not.toHaveBeenCalled();
    });
  });

  describe('setupNotificationListeners', () => {
    it('returns a cleanup function', () => {
      const removeForeground = jest.fn();
      const removeResponse = jest.fn();
      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue({ remove: removeForeground });
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue({ remove: removeResponse });

      const router = { push: jest.fn() } as unknown as import('expo-router').Router;
      const cleanup = setupNotificationListeners(router);

      cleanup();

      expect(removeForeground).toHaveBeenCalled();
      expect(removeResponse).toHaveBeenCalled();
    });

    it('navigates to the URL in the notification payload', () => {
      let responseHandler: ((response: unknown) => void) | undefined;
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockImplementation((handler) => {
        responseHandler = handler;
        return { remove: jest.fn() };
      });

      const router = { push: jest.fn() } as unknown as import('expo-router').Router;
      setupNotificationListeners(router);

      responseHandler?.({
        notification: { request: { content: { data: { url: '/settings' } } } },
      });

      expect(router.push).toHaveBeenCalledWith('/settings');
    });

    it('ignores routing failures', () => {
      let responseHandler: ((response: unknown) => void) | undefined;
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockImplementation((handler) => {
        responseHandler = handler;
        return { remove: jest.fn() };
      });

      const router = { push: jest.fn().mockImplementation(() => {
        throw new Error('bad route');
      }) } as unknown as import('expo-router').Router;

      setupNotificationListeners(router);

      expect(() => {
        responseHandler?.({
          notification: { request: { content: { data: { url: '/settings' } } } },
        });
      }).not.toThrow();
    });

    it('handles foreground notifications', () => {
      let foregroundHandler: (() => void) | undefined;
      (Notifications.addNotificationReceivedListener as jest.Mock).mockImplementation((handler) => {
        foregroundHandler = handler;
        return { remove: jest.fn() };
      });

      setupNotificationListeners({ push: jest.fn() } as unknown as import('expo-router').Router);

      expect(() => {
        foregroundHandler?.();
      }).not.toThrow();
    });
  });
});
