import { useRouter } from 'expo-router';
import { formatCurrency } from '@rhynode/shared';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { usePersonalData } from '~/hooks/use-personal-data';

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

export default function AccountsScreen() {
  const router = useRouter();
  const { data, isLoading } = usePersonalData<{ accounts: Account[] }>('accounts');

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Pressable onPress={() => router.back()} className="mb-4">
        <Text className="text-primary">← Volver</Text>
      </Pressable>
      <Text className="text-foreground text-2xl font-bold mb-4">Cuentas</Text>

      {isLoading ? <Text className="text-muted-foreground">Cargando...</Text> : null}

      {data?.accounts.map((account) => (
        <View key={account.id} className="bg-card rounded-2xl p-4 mb-3">
          <Text className="text-foreground font-medium">{account.name}</Text>
          <Text className="text-muted-foreground text-sm capitalize">{account.type.toLowerCase()}</Text>
          <Text className="text-foreground text-lg font-bold mt-1">{formatCurrency(account.balance, account.currency, 'es')}</Text>
        </View>
      ))}
    </View>
  );
}
