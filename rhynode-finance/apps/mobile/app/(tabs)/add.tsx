import { useLocalSearchParams } from 'expo-router';
import { QuickAddForm } from '~/components/features/quick-add-form';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

export default function AddTab() {
  const params = useLocalSearchParams();
  const merchant = typeof params.merchant === 'string' ? params.merchant : undefined;
  const total = typeof params.total === 'string' ? params.total : undefined;
  const date = typeof params.date === 'string' ? params.date : undefined;

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Text className="text-foreground text-2xl font-bold mb-6">Agregar movimiento</Text>
      <QuickAddForm initialMerchant={merchant} initialTotal={total} initialDate={date} />
    </View>
  );
}
