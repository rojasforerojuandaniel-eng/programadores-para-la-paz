import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Switch,
  type ColorValue,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '~/components/features/theme-toggle';
import { LocaleToggle } from '~/components/features/locale-toggle';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Pressable } from '~/components/ui/pressable';
import { ScrollView } from '~/components/ui/scroll-view';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { API_URL } from '~/lib/api';
import { authenticateBiometric, isBiometricAvailable } from '~/lib/biometric';
import { requestPushPermissionsAsync, registerPushTokenAsync } from '~/lib/notifications';
import { useTheme } from '~/lib/theme';
import { showToast } from '~/hooks/use-toast';
import { cn } from '~/lib/utils';

const PUSH_ENABLED_KEY = '@rhynode/push-enabled';
const BIOMETRIC_ENABLED_KEY = '@rhynode/biometric-enabled';

interface SwitchColors {
  trackFalse: ColorValue;
  trackTrue: ColorValue;
  thumb: ColorValue;
  iosBackground: ColorValue;
}

function useSwitchColors(): SwitchColors {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return {
    trackFalse: isDark ? '#26272b' : '#d4d4d8',
    trackTrue: '#047857',
    thumb: '#ffffff',
    iosBackground: isDark ? '#26272b' : '#d4d4d8',
  };
}

function SettingsSwitch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const colors = useSwitchColors();

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.trackFalse, true: colors.trackTrue }}
      thumbColor={colors.thumb}
      ios_backgroundColor={colors.iosBackground}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
    />
  );
}

function SettingsRow({
  label,
  description,
  children,
  testID,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      className="flex-row items-center justify-between gap-4 py-3"
    >
      <View className="flex-1 gap-1">
        <Text className="text-base font-medium text-foreground">{label}</Text>
        {description && (
          <Text className="text-sm text-muted-foreground">{description}</Text>
        )}
      </View>
      {children}
    </View>
  );
}

function LegalLink({
  label,
  url,
  errorMessage,
}: {
  label: string;
  url: string;
  errorMessage: string;
}) {
  const handlePress = () => {
    void Linking.openURL(url).catch(() => {
      showToast(errorMessage, 'error');
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="link"
      accessibilityLabel={label}
      className="flex-row items-center justify-between py-3 active:opacity-70"
    >
      <Text className="text-base text-foreground">{label}</Text>
      <Text className="text-2xl text-muted-foreground">→</Text>
    </Pressable>
  );
}

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
      await signOut();
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
        <Pressable onPress={() => router.back()} className="self-start">
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
