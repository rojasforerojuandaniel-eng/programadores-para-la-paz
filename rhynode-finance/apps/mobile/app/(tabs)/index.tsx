import { useRouter } from 'expo-router';
import { RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Calendar, Receipt } from 'lucide-react-native';
import { BalanceCard } from '~/components/features/balance-card';
import { DashboardSkeleton } from '~/components/features/dashboard-skeleton';
import { HealthScoreRing } from '~/components/features/health-score-ring';
import { KpiCard } from '~/components/features/kpi-card';
import { AnimatePresence, MotiView } from '~/components/ui/moti-view';
import { EmptyState } from '~/components/ui/empty-state';
import { ErrorState } from '~/components/ui/error-state';
import { ScrollView } from '~/components/ui/scroll-view';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { useDashboardSummary } from '~/hooks/use-dashboard';
import { useReducedMotion } from '~/hooks/use-reduced-motion';
import { colors } from '~/theme/colors';

export default function HomeTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading, isError, isFetching, refetch, error } = useDashboardSummary();
  const reducedMotion = useReducedMotion();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 24, gap: 16 }}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      <Text className="text-foreground text-2xl font-bold mb-2">{t('dashboard.title')}</Text>

      {isLoading && !data ? (
        <DashboardSkeleton />
      ) : isError && !data ? (
        <ErrorState
          message={t('errors.connectionRetry')}
          onRetry={refetch}
          error={error}
        />
      ) : data ? (
        data.totalBalance === 0 && data.income === 0 && data.expense === 0 ? (
          <EmptyState
            icon={Receipt}
            title={t('common.empty.noTransactionsTitle')}
            subtitle={t('common.empty.noTransactionsSubtitle')}
            action={{
              label: t('common.actions.addTransaction'),
              onPress: () => router.push('/(tabs)/add'),
            }}
          />
        ) : reducedMotion ? (
          <View className="gap-4">
            <BalanceCard balance={data.totalBalance} currency={data.currency} />

            <View className="flex-row gap-4">
              <KpiCard label={t('dashboard.kpis.income')} amount={data.income} currency={data.currency} variant="income" />
              <KpiCard label={t('dashboard.kpis.expense')} amount={data.expense} currency={data.currency} variant="expense" />
            </View>

            <HealthScoreRing score={data.healthScore} />

            <View className="gap-3">
              <Text className="text-foreground text-lg font-semibold">{t('dashboard.upcomingPayments.title')}</Text>
              {data.upcomingItems.length > 0 ? (
                data.upcomingItems.map((item) => (
                  <View key={item.id} className="bg-card rounded-2xl p-4">
                    <Text className="text-foreground font-medium">{item.title}</Text>
                    <Text className="text-muted-foreground text-sm">{item.dueDate ? new Date(item.dueDate).toLocaleDateString('es-CO') : ''}</Text>
                  </View>
                ))
              ) : (
                <EmptyState
                  icon={Calendar}
                  title={t('dashboard.upcomingPayments.empty.title')}
                  subtitle={t('dashboard.upcomingPayments.empty.subtitle')}
                />
              )}
            </View>
          </View>
        ) : (
          <AnimatePresence>
            <MotiView
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 400 }}
              className="gap-4"
            >
              <BalanceCard balance={data.totalBalance} currency={data.currency} />

              <View className="flex-row gap-4">
                <KpiCard label={t('dashboard.kpis.income')} amount={data.income} currency={data.currency} variant="income" />
                <KpiCard label={t('dashboard.kpis.expense')} amount={data.expense} currency={data.currency} variant="expense" />
              </View>

              <HealthScoreRing score={data.healthScore} />

              <View className="gap-3">
                <Text className="text-foreground text-lg font-semibold">{t('dashboard.upcomingPayments.title')}</Text>
                {data.upcomingItems.length > 0 ? (
                  data.upcomingItems.map((item) => (
                    <View key={item.id} className="bg-card rounded-2xl p-4">
                      <Text className="text-foreground font-medium">{item.title}</Text>
                      <Text className="text-muted-foreground text-sm">{item.dueDate ? new Date(item.dueDate).toLocaleDateString('es-CO') : ''}</Text>
                    </View>
                  ))
                ) : (
                  <EmptyState
                    icon={Calendar}
                    title={t('dashboard.upcomingPayments.empty.title')}
                    subtitle={t('dashboard.upcomingPayments.empty.subtitle')}
                  />
                )}
              </View>
            </MotiView>
          </AnimatePresence>
        )
      ) : null}
    </ScrollView>
  );
}
