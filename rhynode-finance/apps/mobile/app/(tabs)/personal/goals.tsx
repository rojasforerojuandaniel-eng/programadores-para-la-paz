import { useEffect, useRef } from 'react';
import { Target } from 'lucide-react-native';
import { formatCurrency } from '@rhynode/shared';
import { PersonalList } from '~/components/features/personal-list';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { hapticNotification } from '~/lib/haptics';
import { usePersonalData } from '~/hooks/use-personal-data';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
}

function GoalCompletionHaptic({ complete }: { complete: boolean }) {
  const triggered = useRef(false);

  useEffect(() => {
    if (complete && !triggered.current) {
      triggered.current = true;
      void hapticNotification();
    }
  }, [complete]);

  return null;
}

export default function GoalsScreen() {
  const { data, isLoading } = usePersonalData<{ goals: Goal[] }>('goals');

  const percent = (g: Goal) => Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));

  return (
    <PersonalList
      title="Metas de ahorro"
      items={data?.goals}
      isLoading={isLoading}
      emptyIcon={Target}
      emptyTitle="No tienes metas aún"
      emptySubtitle="Define una meta y empieza a ahorrar con propósito."
      renderItem={(goal) => {
        const complete = percent(goal) >= 100;
        return (
          <View className="bg-card rounded-2xl p-4">
            <GoalCompletionHaptic complete={complete} />
            <Text className="text-foreground font-medium">{goal.name}</Text>
            <Text className="text-muted-foreground text-sm">
              {formatCurrency(goal.currentAmount, goal.currency, 'es')} de {formatCurrency(goal.targetAmount, goal.currency, 'es')}
            </Text>
            <View className="h-2 bg-secondary rounded-full mt-2 overflow-hidden">
              <View className="h-full bg-success" style={{ width: `${percent(goal)}%` }} />
            </View>
          </View>
        );
      }}
    />
  );
}
