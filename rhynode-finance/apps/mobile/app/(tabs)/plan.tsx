import { useRouter } from 'expo-router';
import { CreditCard, Target, PiggyBank, Scale, Repeat, Calendar, Sparkles } from 'lucide-react-native';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { AnimatedListItem } from '~/components/ui/animated-list-item';

const items = [
  { label: 'Cuentas', description: 'Administra tus cuentas bancarias y efectivo', route: '/(tabs)/personal/accounts' as const, icon: CreditCard, color: '#3b82f6' },
  { label: 'Presupuestos', description: 'Establece límites por categoría', route: '/(tabs)/personal/budgets' as const, icon: Target, color: '#ef4444' },
  { label: 'Metas', description: 'Ahorra para tus objetivos', route: '/(tabs)/personal/goals' as const, icon: PiggyBank, color: '#10b981' },
  { label: 'Deudas', description: 'Controla tus préstamos', route: '/(tabs)/personal/debts' as const, icon: Scale, color: '#f59e0b' },
  { label: 'Recurrentes', description: 'Pagos que se repiten cada mes', route: '/(tabs)/personal/recurring' as const, icon: Repeat, color: '#8b5cf6' },
  { label: 'Suscripciones', description: 'Servicios y membresías activas', route: '/(tabs)/personal/subscriptions' as const, icon: Sparkles, color: '#ec4899' },
  { label: 'Calendario', description: 'Vista de pagos por fecha', route: '/(tabs)/personal/calendar' as const, icon: Calendar, color: '#06b6d4' },
];

export default function PlanTab() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Text className="text-foreground text-2xl font-bold mb-2">Plan financiero</Text>
      <Text className="text-muted-foreground text-sm mb-6">Organiza tu vida financiera</Text>
      <View className="gap-3">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <AnimatedListItem key={item.route} index={index}>
              <Pressable
                onPress={() => router.push(item.route)}
                className="flex-row items-center bg-card rounded-2xl p-4 active:opacity-80"
              >
                <View
                  className="w-12 h-12 rounded-xl items-center justify-center"
                  style={{ backgroundColor: `${item.color}20` }}
                >
                  <Icon color={item.color} size={24} />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-foreground text-base font-semibold">{item.label}</Text>
                  <Text className="text-muted-foreground text-sm mt-0.5">{item.description}</Text>
                </View>
                <Text className="text-muted-foreground text-lg">›</Text>
              </Pressable>
            </AnimatedListItem>
          );
        })}
      </View>
    </View>
  );
}
