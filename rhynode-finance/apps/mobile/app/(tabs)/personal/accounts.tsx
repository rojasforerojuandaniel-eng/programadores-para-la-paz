import { useRouter } from 'expo-router';
import { Wallet } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { PersonalList } from '~/components/features/personal-list';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { usePersonalData } from '~/hooks/use-personal-data';
import { localizedFormatCurrency } from '~/lib/i18n-locale';

export default function AccountsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = usePersonalData('accounts');

  return (
    <PersonalList
      title={t('dashboard.personal.accounts.title')}
      items={data?.accounts}
      isLoading={isLoading}
      isError={isError}
      error={error}
      refetch={refetch}
      emptyIcon={Wallet}
      emptyTitle={t('dashboard.personal.accounts.empty.title')}
      emptySubtitle={t('dashboard.personal.accounts.empty.subtitle')}
      action={{ label: t('common.actions.addTransaction'), onPress: () => router.push('/(tabs)/add') }}
      renderItem={(account) => (
        <View className="bg-card rounded-2xl p-4">
          <Text className="text-foreground font-medium">{account.name}</Text>
          <Text className="text-muted-foreground text-sm capitalize">{account.type.toLowerCase()}</Text>
          <Text className="text-foreground text-lg font-bold mt-1">{localizedFormatCurrency(account.balance, account.currency)}</Text>
        </View>
      )}
    />
  );
}
