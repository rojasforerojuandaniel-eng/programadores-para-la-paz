import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { usePersonalData } from '~/hooks/use-personal-data';

export default function CalendarScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading } = usePersonalData('calendar');

  const rawEvents = [
    ...(data?.debts ?? []).map((d) => ({ ...d, type: 'debt' as const, date: d.dueDate })),
    ...(data?.goals ?? []).map((g) => ({ ...g, type: 'goal' as const, date: g.deadline })),
  ];

  const events = rawEvents
    .filter((e): e is typeof rawEvents[number] & { date: string } => !!e.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Pressable onPress={() => router.back()} className="mb-4">
        <Text className="text-primary">{t('common.actions.back')}</Text>
      </Pressable>
      <Text className="text-foreground text-2xl font-bold mb-4">{t('dashboard.personal.calendar.title')}</Text>

      {isLoading ? <Text className="text-muted-foreground">{t('common.loading')}</Text> : null}

      {events.map((event) => (
        <View key={`${event.type}-${event.id}`} className="bg-card rounded-2xl p-4 mb-3">
          <Text className="text-foreground font-medium">{event.name}</Text>
          <Text className="text-muted-foreground text-sm capitalize">
            {event.type} · {new Date(event.date).toLocaleDateString('es-CO')}
          </Text>
        </View>
      ))}
    </View>
  );
}
