import { useRouter } from 'expo-router';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { usePersonalData } from '~/hooks/use-personal-data';

interface CalendarEvent {
  id: string;
  name: string;
  dueDate?: string | null;
  deadline?: string | null;
  amount?: number;
  type: 'debt' | 'goal';
}

export default function CalendarScreen() {
  const router = useRouter();
  const { data, isLoading } = usePersonalData('calendar');

  const events = [
    ...(data?.debts ?? []).map((d) => ({ ...d, type: 'debt' as const, date: d.dueDate })),
    ...(data?.goals ?? []).map((g) => ({ ...g, type: 'goal' as const, date: g.deadline })),
  ].filter((e) => e.date).sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Pressable onPress={() => router.back()} className="mb-4">
        <Text className="text-primary">← Volver</Text>
      </Pressable>
      <Text className="text-foreground text-2xl font-bold mb-4">Calendario</Text>

      {isLoading ? <Text className="text-muted-foreground">Cargando...</Text> : null}

      {events.map((event) => (
        <View key={`${event.type}-${event.id}`} className="bg-card rounded-2xl p-4 mb-3">
          <Text className="text-foreground font-medium">{event.name}</Text>
          <Text className="text-muted-foreground text-sm capitalize">{event.type} · {new Date(event.date!).toLocaleDateString('es-CO')}</Text>
        </View>
      ))}
    </View>
  );
}
