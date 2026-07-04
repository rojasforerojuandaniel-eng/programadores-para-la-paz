import { useEffect, useRef, useState } from 'react';

import { ActivityIndicator, AppState, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { SplashScreen, useRouter, useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';
import { authenticateBiometric, BIOMETRIC_ENABLED_KEY, isBiometricAvailable } from '~/lib/biometric';
import { PinLock } from '~/components/features/pin-lock';
import { Text } from '~/components/ui/text';
import { colors } from '~/theme/colors';

function SplashLoader({ reason }: { reason: string }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text className="mt-4 text-muted-foreground">{t('common.appName')}</Text>
      {__DEV__ ? (
        <Text className="mt-2 text-xs text-muted-foreground">{reason}</Text>
      ) : null}
    </View>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [biometricPassed, setBiometricPassed] = useState(false);
  const [showPinLock, setShowPinLock] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
      void SplashScreen.hideAsync();
      return;
    }

    if (isSignedIn && inAuthGroup && biometricPassed) {
      router.replace('/(tabs)');
    }
  }, [isLoaded, isSignedIn, segments, router, biometricPassed]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || biometricPassed || showPinLock) return;

    const unlock = async () => {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      if (enabled !== 'true') {
        if (isMounted.current) {
          setBiometricPassed(true);
          await SplashScreen.hideAsync();
        }
        return;
      }

      const available = await isBiometricAvailable();
      if (!available) {
        if (isMounted.current) {
          setShowPinLock(true);
          await SplashScreen.hideAsync();
        }
        return;
      }

      const ok = await authenticateBiometric({
        promptMessage: t('auth.biometric.promptMessage'),
        fallbackLabel: t('auth.biometric.fallbackPin'),
        disableDeviceCredentials: true,
      });

      if (isMounted.current) {
        if (ok) {
          setBiometricPassed(true);
        } else {
          setShowPinLock(true);
        }
        await SplashScreen.hideAsync();
      }
    };

    void unlock();
  }, [isLoaded, isSignedIn, biometricPassed, showPinLock, t]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        setBiometricPassed(false);
      }
    });
    return () => subscription.remove();
  }, []);

  if (!isLoaded) {
    return <SplashLoader reason="loading auth" />;
  }

  if (isSignedIn && !biometricPassed) {
    if (showPinLock) {
      return (
        <PinLock
          onUnlock={() => setBiometricPassed(true)}
          allowDeviceFallback
        />
      );
    }
    return <SplashLoader reason="auth gate" />;
  }

  return <>{children}</>;
}
