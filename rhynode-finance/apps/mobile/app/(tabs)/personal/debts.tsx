import { CreditCard } from 'lucide-react-native';
import { formatCurrency } from '@rhynode/shared';
import { PersonalList } from '~/components/features/personal-list';
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
  const { data, isLoading } = usePersonalData<{ debts: Debt[] }>('debts');

  return (
    <PersonalList
      title="Deudas"
      items={data?.debts}
      isLoading={isLoading}
      emptyIcon={CreditCard}
      emptyTitle="No tienes deudas registradas"
      emptySubtitle="Registra tus deudas para planear pagos sin estrés."
      renderItem={(debt) => (
        <View className="bg-card rounded-2xl p-4">
          <Text className="text-foreground font-medium">{debt.name}</Text>
          <Text className="text-muted-foreground text-sm">{debt.type === 'OWE' ? 'Debo' : 'Me deben'}</Text>
          <Text className="text-foreground text-lg font-bold mt-1">{formatCurrency(debt.remainingAmount, debt.currency, 'es')}</Text>
          {debt.dueDate ? (
            <Text className="text-muted-foreground text-sm">Vence: {new Date(debt.dueDate).toLocaleDateString('es-CO')}</Text>
          ) : null}
        </View>
      )}
    />
  );
}
