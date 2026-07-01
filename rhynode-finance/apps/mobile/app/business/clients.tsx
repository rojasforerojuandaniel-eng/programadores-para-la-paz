import { useRouter } from 'expo-router';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { useBusinessData } from '~/hooks/use-business-data';

export default function ClientsScreen() {
  const router = useRouter();
  const { data, isLoading } = useBusinessData('clients');

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Pressable onPress={() => router.back()} className="mb-4">
        <Text className="text-primary">← Volver</Text>
      </Pressable>
      <Text className="text-foreground text-2xl font-bold mb-4">Clientes</Text>

      {isLoading ? <Text className="text-muted-foreground">Cargando...</Text> : null}

      {data?.clients.map((client) => (
        <View key={client.id} className="bg-card rounded-2xl p-4 mb-3">
          <Text className="text-foreground font-medium">{client.name}</Text>
          {client.email ? <Text className="text-muted-foreground text-sm">{client.email}</Text> : null}
          {client.phone ? <Text className="text-muted-foreground text-sm">{client.phone}</Text> : null}
        </View>
      ))}
    </View>
  );
}
