import { useRouter } from 'expo-router';
import { Receipt } from 'lucide-react-native';
import { FlatList, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TransactionListItem } from '~/components/features/transaction-list-item';
import { AnimatedListItem } from '~/components/ui/animated-list-item';
import { EmptyState } from '~/components/ui/empty-state';
import { ErrorState } from '~/components/ui/error-state';
import { Skeleton, SkeletonGroup } from '~/components/ui/skeleton';
import { View } from '~/components/ui/view';
import { useTransactions } from '~/hooks/use-transactions';
import { colors } from '~/theme/colors';

export default function TransactionsTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading, isError, isFetching, refetch, error } = useTransactions();

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

  if (isError && !data) {
    return (
      <View className="flex-1 bg-background px-6 pt-6">
        <ErrorState
          message={t('errors.connectionRetry')}
          onRetry={refetch}
          error={error}
        />
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
            title={t('common.empty.noTransactionsTitle')}
            subtitle={t('common.empty.noTransactionsSubtitle')}
            action={{
              label: t('common.actions.addTransaction'),
              onPress: () => router.push('/(tabs)/add'),
            }}
          />
        }
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
      />
    </View>
  );
}
