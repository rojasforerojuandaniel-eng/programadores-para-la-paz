import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import i18n from '~/lib/i18n';
import { createApiClient } from '~/lib/api';
import type { Router } from 'expo-router';

export const PUSH_ENABLED_KEY = '@rhynode/push-enabled';
export const PUSH_CONSENT_KEY = '@rhynode/consent-push';

export type PushConsent = 'granted' | 'denied' | null;

export async function getPushConsentAsync(): Promise<PushConsent> {
  const value = await SecureStore.getItemAsync(PUSH_CONSENT_KEY);
  if (value === 'granted' || value === 'denied') return value;
  return null;
}

export async function setPushConsentAsync(value: PushConsent): Promise<void> {
  if (value === null) {
    await SecureStore.deleteItemAsync(PUSH_CONSENT_KEY);
    return;
  }
  await SecureStore.setItemAsync(PUSH_CONSENT_KEY, value);
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestPushPermissionsAsync(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
      android: {},
    });
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return false;

  try {
    const channelId = 'rhynode-default';
    await Notifications.setNotificationChannelAsync(channelId, {
      name: i18n.t('common.appName'),
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  } catch {
    // Channel setup is best-effort; proceed if it fails.
  }

  return true;
}

export async function registerPushTokenAsync(
  getToken: () => Promise<string | null>
): Promise<void> {
  const pushEnabled = await AsyncStorage.getItem(PUSH_ENABLED_KEY);
  if (pushEnabled !== 'true') return;

  const consent = await getPushConsentAsync();
  if (consent !== 'granted') return;

  const granted = await requestPushPermissionsAsync();
  if (!granted) return;

  const token = await Notifications.getExpoPushTokenAsync();
  if (!token?.data) return;

  const jwt = await getToken();
  if (!jwt) return;

  await createApiClient(jwt).post<{ ok: boolean }>('/api/mobile/push-token', {
    token: token.data,
  });
}

export function setupNotificationListeners(router: Router): () => void {
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    () => {
      // Foreground notifications are rendered by the OS handler.
    }
  );

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const url = response?.notification?.request?.content?.data?.url;
      if (typeof url === 'string' && url.length > 0) {
        try {
          router.push(url);
        } catch {
          // Ignore deep-link routing failures.
        }
      }
    }
  );

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}
