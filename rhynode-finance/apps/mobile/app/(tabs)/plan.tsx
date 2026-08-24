import { useRouter } from 'expo-router';
import { CreditCard, Target, PiggyBank, Scale, Repeat, Calendar, Sparkles } from 'lucide-react-native';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

const items = [
  { label: 'Cuentas', route: '/(tabs)/personal/accounts' as const, icon: CreditCard },
  { label: 'Presupuestos', route: '/(tabs)/personal/budgets' as const, icon: Target },
  { label: 'Metas', route: '/(tabs)/personal/goals' as const, icon: PiggyBank },
  { label: 'Deudas', route: '/(tabs)/personal/debts' as const, icon: Scale },
  { label: 'Recurrentes', route: '/(tabs)/personal/recurring' as const, icon: Repeat },
  { label: 'Suscripciones', route: '/(tabs)/personal/subscriptions' as const, icon: Sparkles },
  { label: 'Calendario', route: '/(tabs)/personal/calendar' as const, icon: Calendar },
];

export default function PlanTab() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Text className="text-foreground text-2xl font-bold mb-6">Plan financiero</Text>
      <View className="gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Pressable
              key={item.route}
              onPress={() => router.push(item.route)}
              className="flex-row items-center bg-card rounded-2xl p-4 active:opacity-80"
            >
              <Icon color="#10b981" size={24} />
              <Text className="text-foreground text-lg font-medium ml-4">{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
