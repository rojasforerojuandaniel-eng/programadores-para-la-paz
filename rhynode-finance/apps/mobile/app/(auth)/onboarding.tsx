import { useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Briefcase, Layers, ChevronRight } from 'lucide-react-native';
import { Button } from '~/components/ui/button';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { hapticImpact } from '~/lib/haptics';

type AppMode = 'personal' | 'business' | 'both';

interface ModeOption {
  id: AppMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    id: 'personal',
    label: 'Personal',
    description: 'Controla tus finanzas personales, presupuestos y metas de ahorro.',
    icon: User,
  },
  {
    id: 'business',
    label: 'Empresa',
    description: 'Facturación electrónica, clientes, proyectos y reportes fiscales.',
    icon: Briefcase,
  },
  {
    id: 'both',
    label: 'Ambas',
    description: 'Usa finanzas personales y empresariales en una sola cuenta.',
    icon: Layers,
  },
];

const MODE_STORAGE_KEY = '@rhynode/app-mode';

export default function OnboardingScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<AppMode | null>(null);

  const onContinue = async () => {
    if (!selected) return;
    await hapticImpact();
    await AsyncStorage.setItem(MODE_STORAGE_KEY, selected);
    router.replace('/(tabs)');
  };

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <View className="flex-1">
        <Text className="text-foreground text-3xl font-bold mb-2">Bienvenido a Rhynode</Text>
        <Text className="text-muted-foreground text-base mb-8">
          Elige cómo quieres usar la app. Podrás cambiar esto después en Ajustes.
        </Text>

        <View className="gap-4">
          {MODE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selected === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  void hapticImpact();
                  setSelected(option.id);
                }}
                className={`flex-row items-center rounded-2xl p-5 border ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card'
                }`}
              >
                <View
                  className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${
                    isSelected ? 'bg-primary' : 'bg-secondary'
                  }`}
                >
                  <Icon size={24} color={isSelected ? '#fafafa' : '#9ca3af'} />
                </View>
                <View className="flex-1">
                  <Text className="text-foreground text-lg font-semibold">{option.label}</Text>
                  <Text className="text-muted-foreground text-sm mt-1">{option.description}</Text>
                </View>
                {isSelected ? (
                  <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                    <Text className="text-primary-foreground text-xs font-bold">✓</Text>
                  </View>
                ) : (
                  <ChevronRight color="#6b7280" size={20} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="pb-12">
        <Button onPress={onContinue} disabled={!selected} className="w-full">
          <Text className="text-primary-foreground font-semibold text-lg">
            Continuar
          </Text>
        </Button>
      </View>
    </View>
  );
}
