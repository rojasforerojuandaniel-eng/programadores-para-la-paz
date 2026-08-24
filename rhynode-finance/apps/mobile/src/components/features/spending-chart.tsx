import { View } from '~/components/ui/view';
import { Text } from '~/components/ui/text';
import { Card } from '~/components/ui/card';
import { formatCurrency } from '@rhynode/shared';

interface SpendingItem {
  category: string;
  amount: number;
  color: string;
}

interface SpendingChartProps {
  items: SpendingItem[];
  currency: string;
  total: number;
}

const COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
];

export function SpendingChart({ items, currency, total }: SpendingChartProps) {
  if (items.length === 0) return null;

  return (
    <Card>
      <Text className="text-foreground text-lg font-semibold mb-4">Gastos por categoría</Text>
      
      {/* Simple horizontal bar chart */}
      <View className="gap-3">
        {items.slice(0, 5).map((item, index) => {
          const percentage = total > 0 ? (item.amount / total) * 100 : 0;
          const color = item.color || COLORS[index % COLORS.length];
          return (
            <View key={item.category}>
              <View className="flex-row justify-between mb-1">
                <Text className="text-foreground text-sm">{item.category}</Text>
                <Text className="text-muted-foreground text-sm">
                  {formatCurrency(item.amount, currency, 'es')}
                </Text>
              </View>
              <View className="h-2 bg-secondary rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full"
                  style={{ width: `${percentage}%`, backgroundColor: color }}
                />
              </View>
            </View>
          );
        })}
      </View>

      {items.length > 5 && (
        <Text className="text-muted-foreground text-xs mt-3 text-center">
          +{items.length - 5} categorías más
        </Text>
      )}
    </Card>
  );
}
