import { formatCurrency } from '@rhynode/shared';
import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { TrendingUp, TrendingDown } from 'lucide-react-native';

interface BalanceCardProps {
  balance: number;
  currency: string;
  trend?: number; // percentage change
}

export function BalanceCard({ balance, currency, trend }: BalanceCardProps) {
  const isPositive = (trend ?? 0) >= 0;

  return (
    <Card className="w-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-muted-foreground text-sm">Balance total</Text>
        {trend !== undefined && (
          <View className={`flex-row items-center gap-1 px-2 py-1 rounded-full ${isPositive ? 'bg-success/20' : 'bg-destructive/20'}`}>
            {isPositive ? (
              <TrendingUp size={12} color="#10b981" />
            ) : (
              <TrendingDown size={12} color="#ef4444" />
            )}
            <Text className={`text-xs font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? '+' : ''}{trend.toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
      <Text className="text-foreground text-4xl font-bold tracking-tight">
        {formatCurrency(balance, currency, 'es')}
      </Text>
      <Text className="text-muted-foreground text-xs mt-2">Actualizado hace un momento</Text>
    </Card>
  );
}
