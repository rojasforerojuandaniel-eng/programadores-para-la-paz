import { RefreshControl } from 'react-native';
import { formatCurrency } from '@rhynode/shared';
import { Calendar, Wallet, CreditCard, Target, TrendingUp } from 'lucide-react-native';
import { BalanceCard } from '~/components/features/balance-card';
import { DashboardSkeleton } from '~/components/features/dashboard-skeleton';
import { HealthScoreRing } from '~/components/features/health-score-ring';
import { KpiCard } from '~/components/features/kpi-card';
import { AnimatePresence, MotiView } from '~/components/ui/moti-view';
import { EmptyState } from '~/components/ui/empty-state';
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
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#10b981" />
      }
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-foreground text-2xl font-bold">Resumen</Text>
        <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
          <TrendingUp size={20} color="#10b981" />
        </View>
      </View>

      {isLoading && !data ? (
        <DashboardSkeleton />
      ) : data ? (
        <AnimatePresence>
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400 }}
            className="gap-4"
          >
            <BalanceCard balance={data.totalBalance} currency={data.currency} />

            <View className="flex-row gap-4">
              <KpiCard label="Ingresos" amount={data.income} currency={data.currency} variant="income" />
              <KpiCard label="Gastos" amount={data.expense} currency={data.currency} variant="expense" />
            </View>

            <HealthScoreRing score={data.healthScore} />

            {/* Quick Stats */}
            <View className="flex-row gap-3">
              <View className="flex-1 bg-card rounded-2xl p-4 items-center">
                <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mb-2">
                  <Wallet size={20} color="#10b981" />
                </View>
                <Text className="text-muted-foreground text-xs">Cuentas</Text>
                <Text className="text-foreground text-lg font-bold">3</Text>
              </View>
              <View className="flex-1 bg-card rounded-2xl p-4 items-center">
                <View className="w-10 h-10 rounded-full bg-accent/20 items-center justify-center mb-2">
                  <CreditCard size={20} color="#3b82f6" />
                </View>
                <Text className="text-muted-foreground text-xs">Deudas</Text>
                <Text className="text-foreground text-lg font-bold">1</Text>
              </View>
              <View className="flex-1 bg-card rounded-2xl p-4 items-center">
                <View className="w-10 h-10 rounded-full bg-success/20 items-center justify-center mb-2">
                  <Target size={20} color="#10b981" />
                </View>
                <Text className="text-muted-foreground text-xs">Metas</Text>
                <Text className="text-foreground text-lg font-bold">2</Text>
              </View>
            </View>

            {/* Upcoming Payments */}
            <View className="gap-3">
              <Text className="text-foreground text-lg font-semibold">Próximos pagos</Text>
              {data.upcomingItems.length > 0 ? (
                data.upcomingItems.map((item) => (
                  <View key={item.id} className="bg-card rounded-2xl p-4 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3 flex-1">
                      <View className="w-10 h-10 rounded-full bg-warning/20 items-center justify-center">
                        <Calendar size={18} color="#f59e0b" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-foreground font-medium">{item.title}</Text>
                        <Text className="text-muted-foreground text-sm">
                          {item.dueDate ? new Date(item.dueDate).toLocaleDateString('es-CO') : ''}
                        </Text>
                      </View>
                    </View>
                    {item.amount > 0 && (
                      <Text className="text-foreground font-bold">
                        {formatCurrency(item.amount, data.currency, 'es')}
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <EmptyState
                  icon={Calendar}
                  title="Sin próximos pagos"
                  subtitle="Agrega deudas o metas para verlos aquí."
                />
              )}
            </View>
          </MotiView>
        </AnimatePresence>
      ) : null}
    </ScrollView>
  );
}
