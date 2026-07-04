import '../global.css';
import '~/lib/i18n';
import { SplashScreen } from 'expo-router';
import { useEffect, useRef } from 'react';

SplashScreen.preventAutoHideAsync();
import * as Sentry from '@sentry/react-native';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { AuthGate } from '~/components/features/auth-gate';
import { tokenCache } from '~/lib/auth';
import { syncPendingMutations } from '~/lib/api';
import { createAsyncStoragePersister, queryClient } from '~/lib/query-client';
import { ThemeProvider, useTheme } from '~/lib/theme';
import {
  getPushConsentAsync,
  registerPushTokenAsync,
  setupNotificationListeners,
} from '~/lib/notifications';
import { useNetworkListener, useNetworkStore } from '~/hooks/use-network';
import { ToastProvider } from '~/components/ui/toast';
import { OfflineBanner } from '~/components/features/offline-banner';
import { initSentryAsync } from '~/lib/sentry';
import { useTranslation } from 'react-i18next';

const persister = createAsyncStoragePersister();

function PushNotificationsSetup() {
  const { isSignedIn, getToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isSignedIn) return;

    let cleanup: (() => void) | undefined;

    const init = async () => {
      const pushConsent = await getPushConsentAsync();
      if (pushConsent !== 'granted') return;

      await registerPushTokenAsync(getToken);
      cleanup = setupNotificationListeners(router);
    };

    void init();

    return () => {
      cleanup?.();
    };
  }, [isSignedIn, getToken, router]);

  return null;
}

function SyncManager() {
  const { getToken } = useAuth();
  const isOnline = useNetworkStore((state) => state.isOnline);
  const wasOffline = useNetworkStore((state) => state.wasOffline);
  const resetWasOffline = useNetworkStore((state) => state.resetWasOffline);
  const hasInitialSynced = useRef(false);

  useNetworkListener();

  useEffect(() => {
    if (!hasInitialSynced.current && isOnline) {
      hasInitialSynced.current = true;
      void syncPendingMutations(getToken);
    }
  }, [getToken, isOnline]);

  useEffect(() => {
    if (isOnline && wasOffline) {
      void syncPendingMutations(getToken).then(() => resetWasOffline());
    }
  }, [isOnline, wasOffline, getToken, resetWasOffline]);

  return null;
}

function DynamicStatusBar() {
  const { resolvedTheme } = useTheme();
  return <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />;
}

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function MissingClerkKeyScreen() {
  const { t } = useTranslation();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#08090e',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Text style={{ color: '#fafafa', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
        {t('errors.configTitle')}
      </Text>
      <Text style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>
        {t('errors.missingClerkKey')}
      </Text>
    </View>
  );
}

function RootLayout() {
  useEffect(() => {
    void initSentryAsync();
  }, []);

  if (!CLERK_PUBLISHABLE_KEY) {
    return <MissingClerkKeyScreen />;
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
      >
        <ThemeProvider>
          <ToastProvider />
          <AuthGate>
            <PushNotificationsSetup />
            <SyncManager />
            <OfflineBanner />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="index" />
            </Stack>
          </AuthGate>
          <DynamicStatusBar />
        </ThemeProvider>
      </PersistQueryClientProvider>
    </ClerkProvider>
  );
}

export default Sentry.wrap(RootLayout);
