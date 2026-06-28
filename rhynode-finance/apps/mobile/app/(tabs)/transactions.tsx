import { FlatList, RefreshControl } from 'react-native';
import { TransactionListItem } from '~/components/features/transaction-list-item';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { useTransactions } from '~/hooks/use-transactions';

export default function TransactionsTab() {
  const { data, isLoading, refetch } = useTransactions();

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={data?.transactions ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24 }}
        renderItem={({ item }) => <TransactionListItem transaction={item} />}
        ListEmptyComponent={
          <Text className="text-muted-foreground text-center mt-8">No hay movimientos aún.</Text>
        }
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#10b981" />}
      />
    </View>
  );
}
