import { useRouter } from 'expo-router';
import { Receipt } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { PersonalList } from '~/components/features/personal-list';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { usePersonalData } from '~/hooks/use-personal-data';
import { localizedFormatCurrency } from '~/lib/i18n-locale';

export default function SubscriptionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = usePersonalData('subscriptions');

  return (
    <PersonalList
      title={t('dashboard.personal.subscriptions.title')}
      items={data?.subscriptions}
      isLoading={isLoading}
      isError={isError}
      error={error}
      refetch={refetch}
      emptyIcon={Receipt}
      emptyTitle={t('dashboard.personal.subscriptions.empty.title')}
      emptySubtitle={t('dashboard.personal.subscriptions.empty.subtitle')}
      action={{ label: t('common.actions.addTransaction'), onPress: () => router.push('/(tabs)/add') }}
      renderItem={(sub) => (
        <View className="bg-card rounded-2xl p-4">
          <Text className="text-foreground font-medium">{sub.name}</Text>
          <Text className="text-muted-foreground text-sm capitalize">{sub.frequency.toLowerCase()}</Text>
          <Text className="text-foreground text-lg font-bold mt-1">{localizedFormatCurrency(sub.amount, sub.currency)}</Text>
        </View>
      )}
    />
  );
}
