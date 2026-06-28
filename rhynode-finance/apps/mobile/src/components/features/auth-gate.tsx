import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { SplashScreen, useRouter, useSegments } from 'expo-router';
import { authenticateBiometric } from '~/lib/biometric';

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

    authenticateBiometric('Desbloquea Rhynode').then((ok) => {
      if (ok) {
        setBiometricPassed(true);
        SplashScreen.hideAsync();
      }
    });
  }, [isLoaded, isSignedIn, biometricPassed]);

  if (!isLoaded || (isSignedIn && !biometricPassed)) {
    return null;
  }

  return <>{children}</>;
}
