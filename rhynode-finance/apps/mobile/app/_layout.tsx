import '../global.css';
import '~/lib/i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '~/lib/theme';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
