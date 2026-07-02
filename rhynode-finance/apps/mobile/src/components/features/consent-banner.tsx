import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { SettingsRow, SettingsSwitch } from '~/components/features/settings-items';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import {
  CONSENT_ANALYTICS_KEY,
  getConsentAsync,
  setConsentAsync,
} from '~/lib/consent';
import { setSentryEnabled } from '~/lib/sentry';
import {
  getPushConsentAsync,
  PUSH_ENABLED_KEY,
  registerPushTokenAsync,
  requestPushPermissionsAsync,
  setPushConsentAsync,
} from '~/lib/notifications';

interface ConsentBannerProps {
  onComplete?: () => void;
  getToken?: () => Promise<string | null>;
  testID?: string;
}

export function ConsentBanner({ onComplete, getToken, testID }: ConsentBannerProps) {
  const { t } = useTranslation();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [analyticsGranted, pushConsent] = await Promise.all([
        getConsentAsync(CONSENT_ANALYTICS_KEY),
        getPushConsentAsync(),
      ]);

      setAnalyticsEnabled(analyticsGranted);
      setPushEnabled(pushConsent === 'granted');
      setIsLoading(false);
    };

    void load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);

    await Promise.all([
      setConsentAsync(CONSENT_ANALYTICS_KEY, analyticsEnabled),
      setPushConsentAsync(pushEnabled ? 'granted' : 'denied'),
      AsyncStorage.setItem(PUSH_ENABLED_KEY, pushEnabled ? 'true' : 'false'),
    ]);

    setSentryEnabled(analyticsEnabled);

    if (pushEnabled && getToken) {
      const granted = await requestPushPermissionsAsync();
      if (granted) {
        await registerPushTokenAsync(getToken);
      }
    }

    setIsSaving(false);
    onComplete?.();
  };

  if (isLoading) {
    return (
      <View className="items-center justify-center py-8" testID={testID}>
        <ActivityIndicator color="#9ca3af" />
      </View>
    );
  }

  return (
    <View className="w-full gap-6" testID={testID}>
      <Card>
        <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          {t('consent.title')}
        </Text>

        <SettingsRow
          label={t('consent.analytics.label')}
          description={t('consent.analytics.description')}
          testID="analytics-consent-row"
        >
          <SettingsSwitch
            value={analyticsEnabled}
            onValueChange={setAnalyticsEnabled}
            accessibilityLabel={t('consent.analytics.label')}
          />
        </SettingsRow>

        <View className="h-px bg-border" />

        <SettingsRow
          label={t('consent.push.label')}
          description={t('consent.push.description')}
          testID="push-consent-row"
        >
          <SettingsSwitch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            accessibilityLabel={t('consent.push.label')}
          />
        </SettingsRow>
      </Card>

      <Button
        onPress={handleSave}
        loading={isSaving}
        disabled={isSaving}
        testID="consent-continue-button"
      >
        <Text className="text-primary-foreground font-semibold">
          {t('common.continue')}
        </Text>
      </Button>
    </View>
  );
}
