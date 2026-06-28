import '../global.css';
import '~/lib/i18n';
import { ClerkProvider } from '@clerk/clerk-expo';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthGate } from '~/components/features/auth-gate';
import { tokenCache } from '~/lib/auth';
import { ThemeProvider } from '~/lib/theme';

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <ThemeProvider>
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="index" />
          </Stack>
        </AuthGate>
        <StatusBar style="light" />
      </ThemeProvider>
    </ClerkProvider>
  );
}
