import { useState, useMemo } from 'react';
import { Receipt, Search, Filter, TrendingUp, TrendingDown } from 'lucide-react-native';
import { FlatList, RefreshControl } from 'react-native';
import { TransactionListItem } from '~/components/features/transaction-list-item';
import { AnimatedListItem } from '~/components/ui/animated-list-item';
import { EmptyState } from '~/components/ui/empty-state';
import { Skeleton, SkeletonGroup } from '~/components/ui/skeleton';
import { TextInput } from '~/components/ui/text-input';
import { View } from '~/components/ui/view';
import { Text } from '~/components/ui/text';
import { Pressable } from '~/components/ui/pressable';
import { useTransactions } from '~/hooks/use-transactions';

type FilterType = 'all' | 'income' | 'expense';

const filterOptions: { key: FilterType; label: string; icon: typeof TrendingUp }[] = [
  { key: 'all', label: 'Todos', icon: Filter },
  { key: 'income', label: 'Ingresos', icon: TrendingUp },
  { key: 'expense', label: 'Gastos', icon: TrendingDown },
];

export default function TransactionsTab() {
  const { data, isLoading, refetch } = useTransactions();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredTransactions = useMemo(() => {
    const transactions = data?.transactions ?? [];
    return transactions.filter((t) => {
      const matchesSearch =
        search === '' ||
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.category?.toLowerCase().includes(search.toLowerCase());
      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'income' && t.amount > 0) ||
        (activeFilter === 'expense' && t.amount < 0);
      return matchesSearch && matchesFilter;
    });
  }, [data?.transactions, search, activeFilter]);

  if (isLoading && !data) {
    return (
      <View className="flex-1 bg-background px-6 pt-6">
        <SkeletonGroup>
          <Skeleton variant="line" className="h-6 w-1/2 mb-4" />
          <Skeleton variant="line" className="h-12 mb-3" />
          <Skeleton variant="line" className="h-8 w-3/4 mb-4" />
          <Skeleton variant="card" className="h-20" />
          <Skeleton variant="card" className="h-20" />
          <Skeleton variant="card" className="h-20" />
        </SkeletonGroup>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="px-6 pt-6 pb-3">
        <Text className="text-foreground text-2xl font-bold mb-4">Movimientos</Text>

        {/* Search bar */}
        <View className="flex-row items-center bg-card rounded-xl px-4 py-3 mb-4">
          <Search size={18} className="text-muted-foreground mr-3" />
          <TextInput
            className="flex-1 text-foreground text-base"
            placeholder="Buscar transacciones..."
            placeholderTextColor="#6b7280"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filter chips */}
        <View className="flex-row gap-2 mb-2">
          {filterOptions.map((option) => {
            const Icon = option.icon;
            const isActive = activeFilter === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => setActiveFilter(option.key)}
                className={`flex-row items-center px-4 py-2 rounded-full ${
                  isActive ? 'bg-primary' : 'bg-card'
                }`}
              >
                <Icon size={14} color={isActive ? '#ffffff' : '#10b981'} />
                <Text
                  className={`text-sm font-medium ml-2 ${
                    isActive ? 'text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Results count */}
        <Text className="text-muted-foreground text-sm">
          {filteredTransactions.length} transaccion{filteredTransactions.length !== 1 ? 'es' : ''}
        </Text>
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24, paddingTop: 8 }}
        renderItem={({ item, index }) => (
          <AnimatedListItem index={index}>
            <TransactionListItem transaction={item} />
          </AnimatedListItem>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={search ? Search : Receipt}
            title={search ? 'Sin resultados' : 'No hay movimientos aún'}
            subtitle={
              search
                ? `No se encontraron transacciones para "${search}"`
                : 'Registra tu primer ingreso o gasto para empezar.'
            }
          />
        }
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#10b981" />}
      />
    </View>
  );
}
