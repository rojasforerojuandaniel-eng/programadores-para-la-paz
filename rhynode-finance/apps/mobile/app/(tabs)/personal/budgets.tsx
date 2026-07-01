import { PiggyBank } from 'lucide-react-native';
import { formatCurrency } from '@rhynode/shared';
import { PersonalList } from '~/components/features/personal-list';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { usePersonalData } from '~/hooks/use-personal-data';
import { Budget } from '~/schemas/personal-data';

export default function BudgetsScreen() {
  const { data, isLoading } = usePersonalData('budgets');

  const percent = (b: Budget) => Math.min(100, Math.round((b.spent / b.amount) * 100));

  return (
    <PersonalList
      title="Presupuestos"
      items={data?.budgets}
      isLoading={isLoading}
      emptyIcon={PiggyBank}
      emptyTitle="No tienes presupuestos aún"
      emptySubtitle="Establece un presupuesto para controlar tus gastos."
      renderItem={(budget) => (
        <View className="bg-card rounded-2xl p-4">
          <Text className="text-foreground font-medium">{budget.name}</Text>
          <Text className="text-muted-foreground text-sm">
            {formatCurrency(budget.spent, budget.currency, 'es')} de {formatCurrency(budget.amount, budget.currency, 'es')}
          </Text>
          <View className="h-2 bg-secondary rounded-full mt-2 overflow-hidden">
            <View className="h-full bg-primary" style={{ width: `${percent(budget)}%` }} />
          </View>
        </View>
      )}
    />
  );
}
