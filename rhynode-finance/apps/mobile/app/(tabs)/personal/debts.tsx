import { useRouter } from 'expo-router';
import { CreditCard } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { PersonalList } from '~/components/features/personal-list';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { usePersonalData } from '~/hooks/use-personal-data';
import { localizedFormatCurrency, localizedFormatDate } from '~/lib/i18n-locale';

export default function DebtsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = usePersonalData('debts');

  return (
    <PersonalList
      title={t('dashboard.personal.debts.title')}
      items={data?.debts}
      isLoading={isLoading}
      isError={isError}
      error={error}
      refetch={refetch}
      emptyIcon={CreditCard}
      emptyTitle={t('dashboard.personal.debts.empty.title')}
      emptySubtitle={t('dashboard.personal.debts.empty.subtitle')}
      action={{ label: t('common.actions.addTransaction'), onPress: () => router.push('/(tabs)/add') }}
      renderItem={(debt) => (
        <View className="bg-card rounded-2xl p-4">
          <Text className="text-foreground font-medium">{debt.name}</Text>
          <Text className="text-muted-foreground text-sm">{debt.type === 'OWE' ? t('dashboard.personal.debts.owe') : t('dashboard.personal.debts.owed')}</Text>
          <Text className="text-foreground text-lg font-bold mt-1">{localizedFormatCurrency(debt.remainingAmount, debt.currency)}</Text>
          {debt.dueDate ? (
            <Text className="text-muted-foreground text-sm">{t('dashboard.personal.debts.dueLabel')}{localizedFormatDate(debt.dueDate)}</Text>
          ) : null}
        </View>
      )}
    />
  );
}
