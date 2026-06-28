import { useRouter } from 'expo-router';
import { formatCurrency } from '@rhynode/shared';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { usePersonalData } from '~/hooks/use-personal-data';

interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  currency: string;
}

export default function SubscriptionsScreen() {
  const router = useRouter();
  const { data, isLoading } = usePersonalData<{ subscriptions: Subscription[] }>('subscriptions');

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Pressable onPress={() => router.back()} className="mb-4">
        <Text className="text-primary">← Volver</Text>
      </Pressable>
      <Text className="text-foreground text-2xl font-bold mb-4">Suscripciones</Text>

      {isLoading ? <Text className="text-muted-foreground">Cargando...</Text> : null}

      {data?.subscriptions.map((sub) => (
        <View key={sub.id} className="bg-card rounded-2xl p-4 mb-3">
          <Text className="text-foreground font-medium">{sub.name}</Text>
          <Text className="text-muted-foreground text-sm capitalize">{sub.frequency.toLowerCase()}</Text>
          <Text className="text-foreground text-lg font-bold mt-1">{formatCurrency(sub.amount, sub.currency, 'es')}</Text>
        </View>
      ))}
    </View>
  );
}
