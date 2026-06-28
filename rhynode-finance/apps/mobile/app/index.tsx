import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-3xl font-bold text-foreground mb-4">Hello Rhynode</Text>
      <Button>
        <Text className="text-primary-foreground font-semibold">Empezar</Text>
      </Button>
    </View>
  );
}
