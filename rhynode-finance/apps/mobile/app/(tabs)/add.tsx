import { QuickAddForm } from '~/components/features/quick-add-form';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

export default function AddTab() {
  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Text className="text-foreground text-2xl font-bold mb-6">Agregar movimiento</Text>
      <QuickAddForm />
    </View>
  );
}
