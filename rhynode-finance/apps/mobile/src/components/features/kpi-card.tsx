import { formatCurrency } from '@rhynode/shared';
import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';

interface KpiCardProps {
  label: string;
  amount: number;
  currency: string;
  variant?: 'income' | 'expense';
}

export function KpiCard({ label, amount, currency, variant = 'income' }: KpiCardProps) {
  const isIncome = variant === 'income';
  return (
    <Card className="flex-1">
      <View className="flex-row items-center gap-2 mb-2">
        <View className={`w-8 h-8 rounded-full items-center justify-center ${isIncome ? 'bg-success/20' : 'bg-destructive/20'}`}>
          {isIncome ? (
            <ArrowDownLeft size={16} color="#10b981" />
          ) : (
            <ArrowUpRight size={16} color="#ef4444" />
          )}
        </View>
        <Text className="text-muted-foreground text-xs">{label}</Text>
      </View>
      <Text className={`text-xl font-bold ${isIncome ? 'text-success' : 'text-destructive'}`}>
        {formatCurrency(amount, currency, 'es')}
      </Text>
    </Card>
  );
}
