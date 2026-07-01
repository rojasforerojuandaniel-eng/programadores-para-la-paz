import { Wallet } from 'lucide-react-native';
import { formatCurrency } from '@rhynode/shared';
import { PersonalList } from '~/components/features/personal-list';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { usePersonalData } from '~/hooks/use-personal-data';

export default function AccountsScreen() {
  const { data, isLoading } = usePersonalData('accounts');

  return (
    <PersonalList
      title="Cuentas"
      items={data?.accounts}
      isLoading={isLoading}
      emptyIcon={Wallet}
      emptyTitle="No tienes cuentas aún"
      emptySubtitle="Crea una cuenta para empezar a organizar tu dinero."
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
