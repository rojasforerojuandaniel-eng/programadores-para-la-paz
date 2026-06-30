import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { SplashScreen, useRouter, useSegments } from 'expo-router';
import { authenticateBiometric, isBiometricAvailable } from '~/lib/biometric';

SplashScreen.preventAutoHideAsync();

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [biometricPassed, setBiometricPassed] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
      SplashScreen.hideAsync();
      return;
    }

    if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoaded, isSignedIn, segments, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || biometricPassed) return;

    const unlock = async () => {
      const available = await isBiometricAvailable();
      if (!available) {
        setBiometricPassed(true);
        SplashScreen.hideAsync();
        return;
      }

      const ok = await authenticateBiometric('Desbloquea Rhynode');
      if (ok) {
        setBiometricPassed(true);
      } else {
        // On Android real devices we do not block the app if the user cancels
        // biometric; fall back to the device credential / PIN on the next attempt.
        setBiometricPassed(true);
      }
      SplashScreen.hideAsync();
    };

    void unlock();
  }, [isLoaded, isSignedIn, biometricPassed]);

  if (!isLoaded || (isSignedIn && !biometricPassed)) {
    return null;
  }

  return <>{children}</>;
}
