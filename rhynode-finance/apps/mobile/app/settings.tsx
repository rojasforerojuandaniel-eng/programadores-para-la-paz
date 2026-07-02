import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '~/components/features/theme-toggle';
import { LocaleToggle } from '~/components/features/locale-toggle';
import { LegalLink, SettingsRow, SettingsSwitch } from '~/components/features/settings-items';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Pressable } from '~/components/ui/pressable';
import { ScrollView } from '~/components/ui/scroll-view';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { API_URL } from '~/lib/api';
import { queryClient } from '~/lib/query-client';
import { resetOfflineQueue } from '~/lib/offline-queue';
import { authenticateBiometric, BIOMETRIC_ENABLED_KEY, isBiometricAvailable } from '~/lib/biometric';
import { showToast } from '~/hooks/use-toast';
import { PUSH_ENABLED_KEY, requestPushPermissionsAsync, registerPushTokenAsync } from '~/lib/notifications';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut, getToken } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const [pushEnabled, setPushEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      const [pushStored, biometricStored, available] = await Promise.all([
        AsyncStorage.getItem(PUSH_ENABLED_KEY),
        SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY),
        isBiometricAvailable(),
      ]);

      setPushEnabled(pushStored === 'true');
      setBiometricEnabled(biometricStored === 'true');
      setBiometricAvailable(available);
      setIsLoadingPreferences(false);
    };

    void loadPreferences();
  }, []);

  const handlePushToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestPushPermissionsAsync();
      if (!granted) {
        showToast(t('settings.notifications.permissionError'), 'error');
        return;
      }

      setPushEnabled(true);
      await AsyncStorage.setItem(PUSH_ENABLED_KEY, 'true');
      await registerPushTokenAsync(getToken);
      return;
    }

    setPushEnabled(false);
    await AsyncStorage.setItem(PUSH_ENABLED_KEY, 'false');
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      const ok = await authenticateBiometric();
      if (!ok) {
        showToast(t('settings.biometric.error'), 'error');
        return;
      }

      setBiometricEnabled(true);
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      return;
    }

    setBiometricEnabled(false);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'false');
  };

  const handleSignOut = () => {
    Alert.alert(t('settings.signOutTitle'), t('settings.signOutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOutConfirm'),
        style: 'destructive',
        onPress: confirmSignOut,
      },
    ]);
  };

  const confirmSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError(null);

    try {
      const token = await getToken();
      if (token) {
        try {
          await fetch(`${API_URL}/api/mobile/push-token`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          // Best-effort push-token revocation; continue with sign-out.
        }
      }

      await signOut();

      queryClient.clear();
      await AsyncStorage.removeItem(PUSH_ENABLED_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      await resetOfflineQueue();

      router.replace('/(auth)/sign-in');
    } catch {
      setSignOutError(t('settings.signOutError'));
    } finally {
      setIsSigningOut(false);
    }
  };

  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const privacyUrl = `${API_URL}/privacy`;
  const termsUrl = `${API_URL}/terms`;

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-6 pt-6 pb-10 gap-6">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel={t('common.actions.back')}
          accessibilityRole="button"
          className="self-start"
        >
          <Text className="text-primary">{t('common.actions.back')}</Text>
        </Pressable>

        <Text className="text-foreground text-3xl font-bold">
          {t('settings.title')}
        </Text>

        {signOutError && (
          <Text className="text-destructive text-center" accessibilityRole="alert">
            {signOutError}
          </Text>
        )}

        <Card>
          <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {t('settings.account.title')}
          </Text>
          <SettingsRow label={t('settings.account.emailLabel')}>
            {isUserLoaded ? (
              <Text className="text-base text-foreground">{email}</Text>
            ) : (
              <ActivityIndicator color="#9ca3af" />
            )}
          </SettingsRow>
        </Card>

        <Card>
          <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {t('settings.theme.title')}
          </Text>
          <ThemeToggle />
        </Card>

        <Card>
          <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {t('settings.language.title')}
          </Text>
          <LocaleToggle />
        </Card>

        <Card>
          <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {t('settings.notifications.title')}
          </Text>
          <SettingsRow
            label={t('settings.notifications.push')}
            description={t('settings.notifications.pushDescription')}
            testID="push-toggle-row"
          >
            {isLoadingPreferences ? (
              <ActivityIndicator color="#9ca3af" />
            ) : (
              <SettingsSwitch
                value={pushEnabled}
                onValueChange={handlePushToggle}
                accessibilityLabel={t('settings.notifications.push')}
              />
            )}
          </SettingsRow>
        </Card>

        {biometricAvailable && (
          <Card>
            <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {t('settings.biometric.title')}
            </Text>
            <SettingsRow
              label={t('settings.biometric.description')}
              description={
                biometricEnabled
                  ? t('settings.biometric.enabled')
                  : t('settings.biometric.disabled')
              }
              testID="biometric-toggle-row"
            >
              {isLoadingPreferences ? (
                <ActivityIndicator color="#9ca3af" />
              ) : (
                <SettingsSwitch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  accessibilityLabel={t('settings.biometric.title')}
                />
              )}
            </SettingsRow>
          </Card>
        )}

        <Card>
          <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {t('settings.legal.title')}
          </Text>
          <LegalLink
            label={t('settings.legal.privacy')}
            url={privacyUrl}
            errorMessage={t('errors.generic')}
          />
          <View className="h-px bg-border" />
          <LegalLink
            label={t('settings.legal.terms')}
            url={termsUrl}
            errorMessage={t('errors.generic')}
          />
        </Card>

        <Button
          variant="destructive"
          onPress={handleSignOut}
          loading={isSigningOut}
          disabled={isSigningOut}
          accessibilityLabel={t('settings.signOutButton')}
        >
          <Text className="text-destructive-foreground text-center font-semibold">
            {t('settings.signOutButton')}
          </Text>
        </Button>
      </View>
    </ScrollView>
  );
}
