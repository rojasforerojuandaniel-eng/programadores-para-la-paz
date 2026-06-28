import { formatCurrency } from '@rhynode/shared';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import type { Transaction } from '~/hooks/use-transactions';

interface TransactionListItemProps {
  transaction: Transaction;
}

export function TransactionListItem({ transaction }: TransactionListItemProps) {
  const isIncome = transaction.type === 'INCOME';
  return (
    <View className="flex-row items-center justify-between bg-card rounded-2xl p-4 mb-3">
      <View className="flex-1">
        <Text className="text-foreground font-medium">{transaction.description}</Text>
        <Text className="text-muted-foreground text-sm">
          {transaction.category} · {new Date(transaction.date).toLocaleDateString('es-CO')}
        </Text>
      </View>
      <Text className={`font-bold ${isIncome ? 'text-success' : 'text-destructive'}`}>
        {isIncome ? '+' : '-'} {formatCurrency(transaction.amount, transaction.currency, 'es')}
      </Text>
    </View>
  );
}
