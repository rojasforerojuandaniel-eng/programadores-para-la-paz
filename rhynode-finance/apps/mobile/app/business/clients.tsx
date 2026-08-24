import { RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { EmptyState } from '~/components/ui/empty-state';
import { Pressable } from '~/components/ui/pressable';
import { Skeleton, SkeletonGroup } from '~/components/ui/skeleton';
import { ScrollView } from '~/components/ui/scroll-view';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { useBusinessData } from '~/hooks/use-business-data';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export default function ClientsScreen() {
  const router = useRouter();
  const { data, isLoading, refetch } = useBusinessData<{ clients: Client[] }>('clients');

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 24 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#10b981" />}
    >
      <Pressable onPress={() => router.back()} className="mb-4">
        <Text className="text-primary">← Volver</Text>
      </Pressable>
      <Text className="text-foreground text-2xl font-bold mb-4">Clientes</Text>

      {isLoading && !data ? (
        <SkeletonGroup>
          <Skeleton variant="card" className="h-20" />
          <Skeleton variant="card" className="h-20" />
          <Skeleton variant="card" className="h-20" />
        </SkeletonGroup>
      ) : data?.clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay clientes aún"
          subtitle="Agrega tu primer cliente para empezar a facturar."
        />
      ) : (
        data?.clients.map((client) => (
          <View key={client.id} className="bg-card rounded-2xl p-4 mb-3">
            <Text className="text-foreground font-medium">{client.name}</Text>
            {client.email ? <Text className="text-muted-foreground text-sm">{client.email}</Text> : null}
            {client.phone ? <Text className="text-muted-foreground text-sm">{client.phone}</Text> : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}
