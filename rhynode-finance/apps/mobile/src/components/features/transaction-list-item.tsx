import { localizedFormatCurrency, localizedFormatDate } from '~/lib/i18n-locale';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import type { Transaction } from '~/hooks/use-transactions';

interface TransactionListItemProps {
  transaction: Transaction;
}

export function TransactionListItem({ transaction }: TransactionListItemProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const isIncome = transaction.type === 'INCOME';

  return (
    <Pressable
      onPress={() => router.push(`/transaction/${transaction.id}`)}
      accessibilityRole="button"
      accessibilityLabel={t('a11y.transaction.viewDetail', { description: transaction.description })}
      className="active:opacity-80"
    >
      <View className="flex-row items-center justify-between bg-card rounded-2xl p-4 mb-3">
        <View className="flex-1">
          <Text className="text-foreground font-medium">{transaction.description}</Text>
          <Text className="text-muted-foreground text-sm">
            {transaction.category ?? t('transactions.noCategory')} · {localizedFormatDate(transaction.date)}
          </Text>
        </View>
        <Text className={`font-bold ${isIncome ? 'text-success' : 'text-destructive'}`}>
          {isIncome ? '+' : '-'} {localizedFormatCurrency(transaction.amount, transaction.currency)}
        </Text>
      </View>
    </Pressable>
  );
}
