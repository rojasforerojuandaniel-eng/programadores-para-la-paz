import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Pressable onPress={() => router.back()} className="mb-4">
        <Text className="text-primary">← Volver</Text>
      </Pressable>
      <Text className="text-foreground text-2xl font-bold mb-6">Ajustes</Text>

      <Pressable
        onPress={() => signOut()}
        className="bg-destructive rounded-2xl p-4 active:opacity-80"
      >
        <Text className="text-destructive-foreground text-center font-semibold">Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}
