import { useRouter } from 'expo-router';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-foreground text-2xl font-bold mb-4">Bienvenido a Rhynode</Text>
      <Text className="text-muted-foreground text-center mb-8">
        Elige cómo quieres usar la app: personal, empresa o ambas.
      </Text>
      <Button onPress={() => router.replace('/(tabs)')}>
        <Text className="text-primary-foreground font-semibold">Continuar</Text>
      </Button>
    </View>
  );
}
