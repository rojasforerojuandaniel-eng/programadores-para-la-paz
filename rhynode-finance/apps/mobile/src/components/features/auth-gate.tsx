import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { SplashScreen, useRouter, useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { authenticateBiometric, isBiometricAvailable } from '~/lib/biometric';
import { PinLock } from '~/components/features/pin-lock';
import { Text } from '~/components/ui/text';
import { colors } from '~/theme/colors';

SplashScreen.preventAutoHideAsync();

function SplashLoader() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text className="mt-4 text-muted-foreground">{t('common.appName')}</Text>
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

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
      void SplashScreen.hideAsync();
      return;
    }

    if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoaded, isSignedIn, segments, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || biometricPassed || showPinLock) return;

    const unlock = async () => {
      const available = await isBiometricAvailable();
      if (!available) {
        setBiometricPassed(true);
        await SplashScreen.hideAsync();
        return;
      }

      const ok = await authenticateBiometric({
        promptMessage: t('auth.biometric.promptMessage'),
        fallbackLabel: t('auth.biometric.fallbackPin'),
        disableDeviceCredentials: true,
      });

      if (ok) {
        setBiometricPassed(true);
      } else {
        setShowPinLock(true);
      }
      await SplashScreen.hideAsync();
    };

    void unlock();
  }, [isLoaded, isSignedIn, biometricPassed, showPinLock, t]);

  if (!isLoaded) {
    return <SplashLoader />;
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
    return <SplashLoader />;
  }

  return <>{children}</>;
}
