import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

export default function TransactionsTab() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-foreground text-xl">Movimientos</Text>
    </View>
  );
}
