import { CreditCard } from 'lucide-react-native';
import { formatCurrency } from '@rhynode/shared';
import { useTranslation } from 'react-i18next';
import { PersonalList } from '~/components/features/personal-list';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { usePersonalData } from '~/hooks/use-personal-data';

export default function DebtsScreen() {
  const { t } = useTranslation();
  const { data, isLoading } = usePersonalData('debts');

  return (
    <PersonalList
      title={t('dashboard.personal.debts.title')}
      items={data?.debts}
      isLoading={isLoading}
      emptyIcon={CreditCard}
      emptyTitle={t('dashboard.personal.debts.empty.title')}
      emptySubtitle={t('dashboard.personal.debts.empty.subtitle')}
      renderItem={(debt) => (
        <View className="bg-card rounded-2xl p-4">
          <Text className="text-foreground font-medium">{debt.name}</Text>
          <Text className="text-muted-foreground text-sm">{debt.type === 'OWE' ? t('dashboard.personal.debts.owe') : t('dashboard.personal.debts.owed')}</Text>
          <Text className="text-foreground text-lg font-bold mt-1">{formatCurrency(debt.remainingAmount, debt.currency, 'es')}</Text>
          {debt.dueDate ? (
            <Text className="text-muted-foreground text-sm">{t('dashboard.personal.debts.dueLabel')}{new Date(debt.dueDate).toLocaleDateString('es-CO')}</Text>
          ) : null}
        </View>
      )}
    />
  );
}
