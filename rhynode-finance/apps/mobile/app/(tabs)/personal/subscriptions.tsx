import { Receipt } from 'lucide-react-native';
import { formatCurrency } from '@rhynode/shared';
import { PersonalList } from '~/components/features/personal-list';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { usePersonalData } from '~/hooks/use-personal-data';

export default function SubscriptionsScreen() {
  const { data, isLoading } = usePersonalData('subscriptions');

  return (
    <PersonalList
      title="Suscripciones"
      items={data?.subscriptions}
      isLoading={isLoading}
      emptyIcon={Receipt}
      emptyTitle="No tienes suscripciones registradas"
      emptySubtitle="Agrega Netflix, Spotify y otras suscripciones para ver su impacto."
      renderItem={(sub) => (
        <View className="bg-card rounded-2xl p-4">
          <Text className="text-foreground font-medium">{sub.name}</Text>
          <Text className="text-muted-foreground text-sm capitalize">{sub.frequency.toLowerCase()}</Text>
          <Text className="text-foreground text-lg font-bold mt-1">{formatCurrency(sub.amount, sub.currency, 'es')}</Text>
        </View>
      )}
    />
  );
}
