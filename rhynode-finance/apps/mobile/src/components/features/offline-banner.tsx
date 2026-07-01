import { useNetworkStore } from '~/hooks/use-network';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

export function OfflineBanner() {
  const isOnline = useNetworkStore((state) => state.isOnline);

  if (isOnline) return null;

  return (
    <View
      className="absolute top-0 left-0 right-0 z-50 bg-warning px-4 pb-2 pt-12"
      accessibilityRole="alert"
      accessibilityLabel="Sin conexión a internet"
    >
      <Text className="text-center text-sm font-medium text-warning-foreground">
        Sin conexión a internet. Algunos cambios están pendientes.
      </Text>
    </View>
  );
}
