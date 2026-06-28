import { formatCurrency } from '@rhynode/shared';
import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';

interface BalanceCardProps {
  balance: number;
  currency: string;
}

export function BalanceCard({ balance, currency }: BalanceCardProps) {
  return (
    <Card className="w-full">
      <Text className="text-muted-foreground text-sm mb-1">Balance total</Text>
      <Text className="text-foreground text-3xl font-bold">{formatCurrency(balance, currency, 'es')}</Text>
    </Card>
  );
}
