import { useEffect, useState } from 'react';
import { Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { Shield, AlertTriangle, XCircle } from 'lucide-react-native';

interface HealthScoreRingProps {
  score: number;
}

const SIZE = 140;
const STROKE_WIDTH = 10;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getScoreConfig(score: number) {
  if (score >= 80) return { color: '#10b981', label: 'Excelente', icon: Shield };
  if (score >= 50) return { color: '#f59e0b', label: 'Regular', icon: AlertTriangle };
  return { color: '#ef4444', label: 'En riesgo', icon: XCircle };
}

const animatedValue = new Animated.Value(0);

export function HealthScoreRing({ score }: HealthScoreRingProps) {
  const { color, label, icon: Icon } = getScoreConfig(score);
  const [offset, setOffset] = useState(CIRCUMFERENCE);

  useEffect(() => {
    const id = animatedValue.addListener(({ value }) => {
      setOffset(CIRCUMFERENCE - (value / 100) * CIRCUMFERENCE);
    });

    Animated.timing(animatedValue, {
      toValue: score,
      duration: 1000,
      useNativeDriver: false,
    }).start();

    return () => {
      animatedValue.removeListener(id);
    };
  }, [score]);

  return (
    <Card className="items-center py-6">
      <View className="items-center">
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="hsl(240 4% 16%)"
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View className="absolute items-center justify-center" style={{ width: SIZE, height: SIZE }}>
          <Text className="text-foreground text-4xl font-bold">{score}</Text>
        </View>
      </View>
      <View className="flex-row items-center gap-2 mt-4">
        <Icon size={16} color={color} />
        <Text className="text-muted-foreground text-sm font-medium">{label}</Text>
      </View>
    </Card>
  );
}
