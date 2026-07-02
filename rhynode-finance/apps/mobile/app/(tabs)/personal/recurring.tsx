import { useRouter } from 'expo-router';
import { Repeat } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { PersonalList } from '~/components/features/personal-list';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { usePersonalData } from '~/hooks/use-personal-data';
import { localizedFormatCurrency } from '~/lib/i18n-locale';

export default function RecurringScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = usePersonalData('recurring');

  return (
    <PersonalList
      title={t('dashboard.personal.recurring.title')}
      items={data?.recurring}
      isLoading={isLoading}
      isError={isError}
      error={error}
      refetch={refetch}
      emptyIcon={Repeat}
      emptyTitle={t('dashboard.personal.recurring.empty.title')}
      emptySubtitle={t('dashboard.personal.recurring.empty.subtitle')}
      action={{ label: t('common.actions.addTransaction'), onPress: () => router.push('/(tabs)/add') }}
      renderItem={(item) => (
        <View className="bg-card rounded-2xl p-4">
          <Text className="text-foreground font-medium">{item.description}</Text>
          <Text className="text-muted-foreground text-sm capitalize">{item.frequency.toLowerCase()}</Text>
          <Text className="text-foreground text-lg font-bold mt-1">{localizedFormatCurrency(item.amount, item.currency)}</Text>
        </View>
      )}
    />
  );
}
