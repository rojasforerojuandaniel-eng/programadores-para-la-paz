import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-foreground text-2xl font-bold mb-4">{t('auth.onboarding.title')}</Text>
      <Text className="text-muted-foreground text-center mb-8">
        {t('auth.onboarding.subtitle')}
      </Text>
      <Button onPress={() => router.replace('/(tabs)')}>
        <Text className="text-primary-foreground font-semibold">{t('common.continue')}</Text>
      </Button>
    </View>
  );
}
