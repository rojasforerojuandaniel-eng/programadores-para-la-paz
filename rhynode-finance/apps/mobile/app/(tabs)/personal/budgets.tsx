import { useRouter } from 'expo-router';
import { formatCurrency } from '@rhynode/shared';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { usePersonalData } from '~/hooks/use-personal-data';

interface Budget {
  id: string;
  name: string;
  amount: number;
  spent: number;
  currency: string;
}

export default function BudgetsScreen() {
  const router = useRouter();
  const { data, isLoading } = usePersonalData<{ budgets: Budget[] }>('budgets');

  const percent = (b: Budget) => Math.min(100, Math.round((b.spent / b.amount) * 100));

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Pressable onPress={() => router.back()} className="mb-4">
        <Text className="text-primary">← Volver</Text>
      </Pressable>
      <Text className="text-foreground text-2xl font-bold mb-4">Presupuestos</Text>

      {isLoading ? <Text className="text-muted-foreground">Cargando...</Text> : null}

      {data?.budgets.map((budget) => (
        <View key={budget.id} className="bg-card rounded-2xl p-4 mb-3">
          <Text className="text-foreground font-medium">{budget.name}</Text>
          <Text className="text-muted-foreground text-sm">
            {formatCurrency(budget.spent, budget.currency, 'es')} de {formatCurrency(budget.amount, budget.currency, 'es')}
          </Text>
          <View className="h-2 bg-secondary rounded-full mt-2 overflow-hidden">
            <View className="h-full bg-primary" style={{ width: `${percent(budget)}%` }} />
          </View>
        </View>
      ))}
    </View>
  );
}
