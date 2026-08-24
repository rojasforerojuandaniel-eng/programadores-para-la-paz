import { useRouter } from 'expo-router';
import { FileText, Users, FolderOpen, Brain, Settings, Camera, ChevronRight } from 'lucide-react-native';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { AnimatedListItem } from '~/components/ui/animated-list-item';

const sections = [
  {
    title: 'Negocio',
    items: [
      { label: 'Facturas', description: 'Gestiona tus facturas y cobros', route: '/business/invoices' as const, icon: FileText, color: '#3b82f6' },
      { label: 'Clientes', description: 'Directorio de clientes', route: '/business/clients' as const, icon: Users, color: '#8b5cf6' },
      { label: 'Proyectos', description: 'Seguimiento de proyectos', route: '/business/projects' as const, icon: FolderOpen, color: '#06b6d4' },
    ],
  },
  {
    title: 'Herramientas',
    items: [
      { label: 'Asesor IA', description: 'Consulta financiera inteligente', route: '/advisor' as const, icon: Brain, color: '#10b981' },
      { label: 'Cámara OCR', description: 'Escanea recibos automáticamente', route: '/camera' as const, icon: Camera, color: '#f59e0b' },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { label: 'Ajustes', description: 'Tema, moneda y perfil', route: '/settings' as const, icon: Settings, color: '#6b7280' },
    ],
  },
];

export default function MoreTab() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Text className="text-foreground text-2xl font-bold mb-2">Más</Text>
      <Text className="text-muted-foreground text-sm mb-6">Herramientas y configuración</Text>

      {sections.map((section, sectionIndex) => (
        <View key={section.title} className="mb-6">
          <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-3 ml-1">
            {section.title}
          </Text>
          <View className="gap-2">
            {section.items.map((item, itemIndex) => {
              const Icon = item.icon;
              return (
                <AnimatedListItem key={item.route} index={sectionIndex * 3 + itemIndex}>
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
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </Pressable>
                </AnimatedListItem>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
