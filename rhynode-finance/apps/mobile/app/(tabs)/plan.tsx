import { useRouter } from 'expo-router';
import { CreditCard, Target, PiggyBank, Scale, Repeat, Calendar, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { colors } from '~/theme/colors';

export default function PlanTab() {
  const { t } = useTranslation();
  const router = useRouter();

  const items = [
    { label: t('common.plan.accounts'), route: '/personal/accounts' as const, icon: CreditCard },
    { label: t('common.plan.budgets'), route: '/personal/budgets' as const, icon: Target },
    { label: t('common.plan.goals'), route: '/personal/goals' as const, icon: PiggyBank },
    { label: t('common.plan.debts'), route: '/personal/debts' as const, icon: Scale },
    { label: t('common.plan.recurring'), route: '/personal/recurring' as const, icon: Repeat },
    { label: t('common.plan.subscriptions'), route: '/personal/subscriptions' as const, icon: Sparkles },
    { label: t('common.plan.calendar'), route: '/personal/calendar' as const, icon: Calendar },
  ];

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Text className="text-foreground text-2xl font-bold mb-6">{t('dashboard.plan.title')}</Text>
      <View className="gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Pressable
              key={item.route}
              onPress={() => router.push(item.route)}
              className="flex-row items-center bg-card rounded-2xl p-4 active:opacity-80"
            >
              <Icon color={colors.primary} size={24} />
              <Text className="text-foreground text-lg font-medium ml-4">{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
