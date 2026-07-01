import { Wallet } from 'lucide-react-native';
import { formatCurrency } from '@rhynode/shared';
import { useTranslation } from 'react-i18next';
import { PersonalList } from '~/components/features/personal-list';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { usePersonalData } from '~/hooks/use-personal-data';

export default function AccountsScreen() {
  const { t } = useTranslation();
  const { data, isLoading } = usePersonalData('accounts');

  return (
    <PersonalList
      title={t('dashboard.personal.accounts.title')}
      items={data?.accounts}
      isLoading={isLoading}
      emptyIcon={Wallet}
      emptyTitle={t('dashboard.personal.accounts.empty.title')}
      emptySubtitle={t('dashboard.personal.accounts.empty.subtitle')}
      renderItem={(account) => (
        <View className="bg-card rounded-2xl p-4">
          <Text className="text-foreground font-medium">{account.name}</Text>
          <Text className="text-muted-foreground text-sm capitalize">{account.type.toLowerCase()}</Text>
          <Text className="text-foreground text-lg font-bold mt-1">{formatCurrency(account.balance, account.currency, 'es')}</Text>
        </View>
      )}
    />
  );
}
