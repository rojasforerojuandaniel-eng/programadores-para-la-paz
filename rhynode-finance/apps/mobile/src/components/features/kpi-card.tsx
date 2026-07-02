import { localizedFormatCurrency } from '~/lib/i18n-locale';
import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';

interface KpiCardProps {
  label: string;
  amount: number;
  currency: string;
  variant?: 'income' | 'expense';
}

export function KpiCard({ label, amount, currency, variant = 'income' }: KpiCardProps) {
  const colorClass = variant === 'income' ? 'text-success' : 'text-destructive';
  return (
    <Card className="flex-1">
      <Text className="text-muted-foreground text-xs mb-1">{label}</Text>
      <Text className={`text-lg font-bold ${colorClass}`}>{localizedFormatCurrency(amount, currency)}</Text>
    </Card>
  );
}
