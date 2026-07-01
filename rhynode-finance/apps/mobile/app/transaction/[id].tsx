import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Pressable onPress={() => router.back()} className="mb-4" accessibilityRole="button" accessibilityLabel="Volver atrás">
        <Text className="text-primary text-lg">← Volver</Text>
      </Pressable>
      <Text className="text-foreground text-2xl font-bold mb-6">Detalle del movimiento</Text>

      <View className="bg-card rounded-2xl p-4 mb-4">
        <Text className="text-muted-foreground text-sm mb-1">ID del movimiento</Text>
        <Text className="text-foreground font-medium">{id}</Text>
      </View>

      <Pressable
        onPress={() => router.back()}
        className="bg-primary rounded-2xl p-4 active:opacity-80"
        accessibilityRole="button"
        accessibilityLabel="Volver a la lista"
      >
        <Text className="text-primary-foreground text-center font-semibold">Volver</Text>
      </Pressable>
    </View>
  );
}
