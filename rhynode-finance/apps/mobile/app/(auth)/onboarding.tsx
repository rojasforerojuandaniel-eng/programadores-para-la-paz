import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { ConsentBanner } from '~/components/features/consent-banner';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { CONSENT_ANALYTICS_KEY, hasConsentDecisionAsync } from '~/lib/consent';
import { getPushConsentAsync } from '~/lib/notifications';

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    const checkConsent = async () => {
      const [analyticsDecided, pushConsent] = await Promise.all([
        hasConsentDecisionAsync(CONSENT_ANALYTICS_KEY),
        getPushConsentAsync(),
      ]);

      if (analyticsDecided && pushConsent !== null) {
        router.replace('/(tabs)');
        return;
      }

      setShowConsent(true);
      setIsLoading(false);
    };

    void checkConsent();
  }, [router]);

  const handleComplete = () => {
    router.replace('/(tabs)');
  };

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-foreground text-2xl font-bold mb-4 text-center">
        {t('auth.onboarding.title')}
      </Text>

      {isLoading ? (
        <ActivityIndicator color="#9ca3af" />
      ) : showConsent ? (
        <ConsentBanner onComplete={handleComplete} getToken={getToken} testID="onboarding-consent-banner" />
      ) : (
        <ActivityIndicator color="#9ca3af" />
      )}
    </View>
  );
}
