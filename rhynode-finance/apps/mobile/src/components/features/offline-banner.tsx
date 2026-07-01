import { useTranslation } from 'react-i18next';
import { useNetworkStore } from '~/hooks/use-network';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

export function OfflineBanner() {
  const { t } = useTranslation();
  const isOnline = useNetworkStore((state) => state.isOnline);

  if (isOnline) return null;

  return (
    <View
      className="absolute top-0 left-0 right-0 z-50 bg-warning px-4 pb-2 pt-12"
      accessibilityRole="alert"
      accessibilityLabel={t('a11y.offline.banner')}
    >
      <Text className="text-center text-sm font-medium text-warning-foreground">
        {t('errors.offline.message')}
      </Text>
    </View>
  );
}
