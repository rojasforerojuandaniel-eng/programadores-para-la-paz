import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-3xl font-bold text-foreground mb-4">{t('common.hello')}</Text>
      <Button>
        <Text className="text-primary-foreground font-semibold">{t('common.getStarted')}</Text>
      </Button>
    </View>
  );
}
