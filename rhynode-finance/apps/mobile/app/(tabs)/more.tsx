import { useRouter } from 'expo-router';
import { FileText, Users, FolderOpen, Brain, Settings } from 'lucide-react-native';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

const items = [
  { label: 'Facturas', route: '/business/invoices' as const, icon: FileText },
  { label: 'Clientes', route: '/business/clients' as const, icon: Users },
  { label: 'Proyectos', route: '/business/projects' as const, icon: FolderOpen },
  { label: 'Asesor IA', route: '/advisor' as const, icon: Brain },
  { label: 'Ajustes', route: '/settings' as const, icon: Settings },
];

export default function MoreTab() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Text className="text-foreground text-2xl font-bold mb-6">Más</Text>
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
