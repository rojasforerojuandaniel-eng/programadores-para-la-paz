import { Repeat } from 'lucide-react-native';
import { formatCurrency } from '@rhynode/shared';
import { useTranslation } from 'react-i18next';
import { PersonalList } from '~/components/features/personal-list';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { usePersonalData } from '~/hooks/use-personal-data';

export default function RecurringScreen() {
  const { t } = useTranslation();
  const { data, isLoading } = usePersonalData('recurring');

  return (
    <PersonalList
      title={t('dashboard.personal.recurring.title')}
      items={data?.recurring}
      isLoading={isLoading}
      emptyIcon={Repeat}
      emptyTitle={t('dashboard.personal.recurring.empty.title')}
      emptySubtitle={t('dashboard.personal.recurring.empty.subtitle')}
      renderItem={(item) => (
        <View className="bg-card rounded-2xl p-4">
          <Text className="text-foreground font-medium">{item.description}</Text>
          <Text className="text-muted-foreground text-sm capitalize">{item.frequency.toLowerCase()}</Text>
          <Text className="text-foreground text-lg font-bold mt-1">{formatCurrency(item.amount, item.currency, 'es')}</Text>
        </View>
      )}
    />
  );
}
