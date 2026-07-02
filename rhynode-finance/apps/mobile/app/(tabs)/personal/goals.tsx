import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Target } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { PersonalList } from '~/components/features/personal-list';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { hapticNotification } from '~/lib/haptics';
import { usePersonalData } from '~/hooks/use-personal-data';
import { Goal } from '~/schemas/personal-data';
import { localizedFormatCurrency } from '~/lib/i18n-locale';

function GoalCompletionHaptic({ complete }: { complete: boolean }) {
  const triggered = useRef(false);

  useEffect(() => {
    if (complete && !triggered.current) {
      triggered.current = true;
      void hapticNotification();
    }
  }, [complete]);

  return null;
}

export default function GoalsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = usePersonalData('goals');

  const percent = (g: Goal) => Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));

  return (
    <PersonalList
      title={t('dashboard.personal.goals.title')}
      items={data?.goals}
      isLoading={isLoading}
      isError={isError}
      error={error}
      refetch={refetch}
      emptyIcon={Target}
      emptyTitle={t('dashboard.personal.goals.empty.title')}
      emptySubtitle={t('dashboard.personal.goals.empty.subtitle')}
      action={{ label: t('common.actions.addTransaction'), onPress: () => router.push('/(tabs)/add') }}
      renderItem={(goal) => {
        const complete = percent(goal) >= 100;
        return (
          <View className="bg-card rounded-2xl p-4">
            <GoalCompletionHaptic complete={complete} />
            <Text className="text-foreground font-medium">{goal.name}</Text>
            <Text className="text-muted-foreground text-sm">
              {localizedFormatCurrency(goal.currentAmount, goal.currency)} {t('common.of')} {localizedFormatCurrency(goal.targetAmount, goal.currency)}
            </Text>
            <View className="h-2 bg-secondary rounded-full mt-2 overflow-hidden">
              <View className="h-full bg-success" style={{ width: `${percent(goal)}%` }} />
            </View>
          </View>
        );
      }}
    />
  );
}
