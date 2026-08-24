import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Moon, Sun, Monitor, ChevronRight, LogOut } from 'lucide-react-native';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { useTheme, type Theme } from '~/lib/theme';
import { hapticImpact } from '~/lib/haptics';

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
];

const CURRENCY_OPTIONS = ['COP', 'USD', 'MXN', 'EUR'];

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showCurrencies, setShowCurrencies] = useState(false);

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Pressable onPress={() => router.back()} className="mb-4">
        <Text className="text-primary">← Volver</Text>
      </Pressable>
      <Text className="text-foreground text-2xl font-bold mb-6">Ajustes</Text>

      {/* Theme Section */}
      <Text className="text-muted-foreground text-sm font-medium mb-3 uppercase tracking-wide">Apariencia</Text>
      <View className="bg-card rounded-2xl mb-6 overflow-hidden">
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                void hapticImpact();
                setTheme(option.value);
              }}
              className={`flex-row items-center justify-between p-4 ${
                option.value !== 'dark' ? 'border-b border-border' : ''
              } ${isActive ? 'bg-primary/10' : ''}`}
            >
              <View className="flex-row items-center gap-3">
                <Icon size={20} color={isActive ? '#10b981' : '#9ca3af'} />
                <Text className={`text-foreground ${isActive ? 'font-semibold' : ''}`}>{option.label}</Text>
              </View>
              {isActive ? (
                <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                  <Text className="text-primary-foreground text-xs">✓</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* Currency Section */}
      <Text className="text-muted-foreground text-sm font-medium mb-3 uppercase tracking-wide">Moneda predeterminada</Text>
      <Pressable
        onPress={() => {
          void hapticImpact();
          setShowCurrencies(!showCurrencies);
        }}
        className="bg-card rounded-2xl p-4 mb-6 flex-row items-center justify-between"
      >
        <Text className="text-foreground">Moneda</Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-muted-foreground">COP</Text>
          <ChevronRight color="#6b7280" size={16} />
        </View>
      </Pressable>

      {showCurrencies && (
        <View className="bg-card rounded-2xl mb-6 overflow-hidden -mt-4">
          {CURRENCY_OPTIONS.map((currency, i) => (
            <Pressable
              key={currency}
              onPress={() => {
                void hapticImpact();
                setShowCurrencies(false);
              }}
              className={`p-4 ${i < CURRENCY_OPTIONS.length - 1 ? 'border-b border-border' : ''}`}
            >
              <Text className="text-foreground">{currency}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Account Section */}
      <Text className="text-muted-foreground text-sm font-medium mb-3 uppercase tracking-wide">Cuenta</Text>
      <Pressable
        onPress={() => signOut()}
        className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex-row items-center justify-center gap-2 active:opacity-80"
      >
        <LogOut color="#ef4444" size={20} />
        <Text className="text-destructive font-semibold">Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}
