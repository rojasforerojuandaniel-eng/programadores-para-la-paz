import { useRouter } from 'expo-router';
import { formatCurrency } from '@rhynode/shared';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { usePersonalData } from '~/hooks/use-personal-data';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
}

export default function GoalsScreen() {
  const router = useRouter();
  const { data, isLoading } = usePersonalData<{ goals: Goal[] }>('goals');

  const percent = (g: Goal) => Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Pressable onPress={() => router.back()} className="mb-4">
        <Text className="text-primary">← Volver</Text>
      </Pressable>
      <Text className="text-foreground text-2xl font-bold mb-4">Metas de ahorro</Text>

      {isLoading ? <Text className="text-muted-foreground">Cargando...</Text> : null}

      {data?.goals.map((goal) => (
        <View key={goal.id} className="bg-card rounded-2xl p-4 mb-3">
          <Text className="text-foreground font-medium">{goal.name}</Text>
          <Text className="text-muted-foreground text-sm">
            {formatCurrency(goal.currentAmount, goal.currency, 'es')} de {formatCurrency(goal.targetAmount, goal.currency, 'es')}
          </Text>
          <View className="h-2 bg-secondary rounded-full mt-2 overflow-hidden">
            <View className="h-full bg-success" style={{ width: `${percent(goal)}%` }} />
          </View>
        </View>
      ))}
    </View>
  );
}
