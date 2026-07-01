import { useRouter } from 'expo-router';
import { formatCurrency, formatDate } from '@rhynode/shared';
import { useTranslation } from 'react-i18next';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { useBusinessData } from '~/hooks/use-business-data';

export default function InvoicesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading } = useBusinessData('invoices');

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Pressable onPress={() => router.back()} className="mb-4">
        <Text className="text-primary">{t('common.actions.back')}</Text>
      </Pressable>
      <Text className="text-foreground text-2xl font-bold mb-4">{t('dashboard.invoicesTitle')}</Text>

      {isLoading ? <Text className="text-muted-foreground">{t('common.loading')}</Text> : null}

      {data?.invoices.map((invoice) => (
        <View key={invoice.id} className="bg-card rounded-2xl p-4 mb-3">
          <Text className="text-foreground font-medium">{invoice.number}</Text>
          <Text className="text-muted-foreground text-sm">{invoice.clientName ?? t('dashboard.noClient')}</Text>
          <Text className="text-foreground text-lg font-bold mt-1">
            {formatCurrency(invoice.total, invoice.currency, 'es')}
          </Text>
          <Text className="text-muted-foreground text-sm capitalize">
            {invoice.status.toLowerCase()}
            {invoice.dueDate ? ` · ${t('dashboard.invoices.due', { date: formatDate(invoice.dueDate, 'es') })}` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}
