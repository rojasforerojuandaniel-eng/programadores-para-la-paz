import { PiggyBank } from 'lucide-react-native';
import { localizedFormatCurrency } from '~/lib/i18n-locale';
import { useTranslation } from 'react-i18next';
import { PersonalList } from '~/components/features/personal-list';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { usePersonalData } from '~/hooks/use-personal-data';
import { Budget } from '~/schemas/personal-data';

export default function BudgetsScreen() {
  const { t } = useTranslation();
  const { data, isLoading } = usePersonalData('budgets');

  const percent = (b: Budget) => Math.min(100, Math.round((b.spent / b.amount) * 100));

  return (
    <PersonalList
      title={t('dashboard.personal.budgets.title')}
      items={data?.budgets}
      isLoading={isLoading}
      emptyIcon={PiggyBank}
      emptyTitle={t('dashboard.personal.budgets.empty.title')}
      emptySubtitle={t('dashboard.personal.budgets.empty.subtitle')}
      renderItem={(budget) => (
        <View className="bg-card rounded-2xl p-4">
          <Text className="text-foreground font-medium">{budget.name}</Text>
          <Text className="text-muted-foreground text-sm">
            {localizedFormatCurrency(budget.spent, budget.currency)} {t('common.of')} {localizedFormatCurrency(budget.amount, budget.currency)}
          </Text>
          <View className="h-2 bg-secondary rounded-full mt-2 overflow-hidden">
            <View className="h-full bg-primary" style={{ width: `${percent(budget)}%` }} />
          </View>
        </View>
      )}
    />
  );
}
