import { useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: confirmSignOut,
      },
    ]);
  };

  const confirmSignOut = async () => {
    setIsSigningOut(true);
    setError(null);

    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch {
      setError('No se pudo cerrar sesión. Inténtalo de nuevo.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Pressable onPress={() => router.back()} className="mb-4">
        <Text className="text-primary">← Volver</Text>
      </Pressable>
      <Text className="text-foreground text-2xl font-bold mb-6">Ajustes</Text>

      {error && (
        <Text className="text-destructive text-center mb-4">{error}</Text>
      )}

      <Pressable
        onPress={handleSignOut}
        disabled={isSigningOut}
        className="bg-destructive rounded-2xl p-4 active:opacity-80 disabled:opacity-50"
      >
        {isSigningOut ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-destructive-foreground text-center font-semibold">
            Cerrar sesión
          </Text>
        )}
      </Pressable>
    </View>
  );
}
