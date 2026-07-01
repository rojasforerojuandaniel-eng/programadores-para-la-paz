import '../global.css';
import '~/lib/i18n';
import { useEffect, useRef } from 'react';
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
  registerPushTokenAsync,
  setupNotificationListeners,
} from '~/lib/notifications';
import { useNetworkListener, useNetworkStore } from '~/hooks/use-network';
import { ToastProvider } from '~/components/ui/toast';

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

function DynamicStatusBar() {
  const { resolvedTheme } = useTheme();
  return <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />;
}

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function MissingClerkKeyScreen() {
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
        Error de configuración
      </Text>
      <Text style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>
        Falta la variable de entorno EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Reconstruye la app con la
        clave de Clerk configurada.
      </Text>
    </View>
  );
}

export default function RootLayout() {
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
