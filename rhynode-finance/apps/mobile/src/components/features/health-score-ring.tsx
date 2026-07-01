import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { colors } from '~/theme/colors';

interface HealthScoreRingProps {
  score: number;
}

export function HealthScoreRing({ score }: HealthScoreRingProps) {
  const color = score >= 80 ? colors.primary : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <Card className="items-center justify-center">
      <View
        className="rounded-full items-center justify-center"
        style={{
          width: 120,
          height: 120,
          borderWidth: 8,
          borderColor: color,
        }}
      >
        <Text className="text-foreground text-3xl font-bold">{score}</Text>
      </View>
      <Text className="text-muted-foreground text-sm mt-3">Health Score</Text>
    </Card>
  );
}
