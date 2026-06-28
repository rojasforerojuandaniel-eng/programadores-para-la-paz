import '../global.css';
import '~/lib/i18n';
import { useEffect, useRef } from 'react';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { AuthGate } from '~/components/features/auth-gate';
import { tokenCache } from '~/lib/auth';
import { syncPendingMutations } from '~/lib/api';
import { createAsyncStoragePersister, queryClient } from '~/lib/query-client';
import { ThemeProvider } from '~/lib/theme';
import {
  registerPushTokenAsync,
  setupNotificationListeners,
} from '~/lib/notifications';
import { useNetworkListener, useNetworkStore } from '~/hooks/use-network';

const persister = createAsyncStoragePersister();

function PushNotificationsSetup() {
  const { isSignedIn, getToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isSignedIn) return;

    let cleanup: (() => void) | undefined;

    const init = async () => {
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

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
      >
        <ThemeProvider>
          <AuthGate>
            <PushNotificationsSetup />
            <SyncManager />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="index" />
            </Stack>
          </AuthGate>
          <StatusBar style="light" />
        </ThemeProvider>
      </PersistQueryClientProvider>
    </ClerkProvider>
  );
}
