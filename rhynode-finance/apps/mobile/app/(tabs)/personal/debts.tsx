import { useRouter } from 'expo-router';
import { formatCurrency } from '@rhynode/shared';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { usePersonalData } from '~/hooks/use-personal-data';

interface Debt {
  id: string;
  name: string;
  type: string;
  remainingAmount: number;
  currency: string;
  dueDate?: string | null;
}

export default function DebtsScreen() {
  const router = useRouter();
  const { data, isLoading } = usePersonalData<{ debts: Debt[] }>('debts');

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Pressable onPress={() => router.back()} className="mb-4">
        <Text className="text-primary">← Volver</Text>
      </Pressable>
      <Text className="text-foreground text-2xl font-bold mb-4">Deudas</Text>

      {isLoading ? <Text className="text-muted-foreground">Cargando...</Text> : null}

      {data?.debts.map((debt) => (
        <View key={debt.id} className="bg-card rounded-2xl p-4 mb-3">
          <Text className="text-foreground font-medium">{debt.name}</Text>
          <Text className="text-muted-foreground text-sm">{debt.type === 'OWE' ? 'Debo' : 'Me deben'}</Text>
          <Text className="text-foreground text-lg font-bold mt-1">{formatCurrency(debt.remainingAmount, debt.currency, 'es')}</Text>
          {debt.dueDate ? (
            <Text className="text-muted-foreground text-sm">Vence: {new Date(debt.dueDate).toLocaleDateString('es-CO')}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
