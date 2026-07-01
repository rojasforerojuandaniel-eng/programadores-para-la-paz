import { useRouter } from 'expo-router';
import { Receipt } from 'lucide-react-native';
import { FlatList, RefreshControl } from 'react-native';
import { TransactionListItem } from '~/components/features/transaction-list-item';
import { AnimatedListItem } from '~/components/ui/animated-list-item';
import { EmptyState } from '~/components/ui/empty-state';
import { Skeleton, SkeletonGroup } from '~/components/ui/skeleton';
import { View } from '~/components/ui/view';
import { useTransactions } from '~/hooks/use-transactions';

export default function TransactionsTab() {
  const router = useRouter();
  const { data, isLoading, refetch } = useTransactions();

  if (isLoading && !data) {
    return (
      <View className="flex-1 bg-background px-6 pt-6">
        <SkeletonGroup>
          <Skeleton variant="line" className="h-6 w-1/2 mb-4" />
          <Skeleton variant="card" className="h-20" />
          <Skeleton variant="card" className="h-20" />
          <Skeleton variant="card" className="h-20" />
        </SkeletonGroup>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={data?.transactions ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24 }}
        renderItem={({ item, index }) => (
          <AnimatedListItem index={index}>
            <TransactionListItem transaction={item} />
          </AnimatedListItem>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={Receipt}
            title="No hay movimientos aún"
            subtitle="Registra tu primer ingreso o gasto para empezar."
            action={{
              label: 'Registrar movimiento',
              onPress: () => router.push('/(tabs)/add'),
            }}
          />
        }
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#10b981" />}
      />
    </View>
  );
}
