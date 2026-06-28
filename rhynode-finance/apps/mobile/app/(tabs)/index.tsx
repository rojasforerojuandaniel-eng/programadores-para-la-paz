import { RefreshControl } from 'react-native';
import { BalanceCard } from '~/components/features/balance-card';
import { HealthScoreRing } from '~/components/features/health-score-ring';
import { KpiCard } from '~/components/features/kpi-card';
import { ScrollView } from '~/components/ui/scroll-view';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { useDashboardSummary } from '~/hooks/use-dashboard';

export default function HomeTab() {
  const { data, isLoading, refetch } = useDashboardSummary();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 24, gap: 16 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#10b981" />}
    >
      <Text className="text-foreground text-2xl font-bold mb-2">Resumen</Text>

      {data ? (
        <>
          <BalanceCard balance={data.totalBalance} currency={data.currency} />

          <View className="flex-row gap-4">
            <KpiCard label="Ingresos" amount={data.income} currency={data.currency} variant="income" />
            <KpiCard label="Gastos" amount={data.expense} currency={data.currency} variant="expense" />
          </View>

          <HealthScoreRing score={data.healthScore} />

          {data.upcomingItems.length > 0 ? (
            <View className="gap-3">
              <Text className="text-foreground text-lg font-semibold">Próximos pagos</Text>
              {data.upcomingItems.map((item) => (
                <View key={item.id} className="bg-card rounded-2xl p-4">
                  <Text className="text-foreground font-medium">{item.title}</Text>
                  <Text className="text-muted-foreground text-sm">{item.dueDate ? new Date(item.dueDate).toLocaleDateString('es-CO') : ''}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <Text className="text-muted-foreground">Cargando dashboard...</Text>
      )}
    </ScrollView>
  );
}
