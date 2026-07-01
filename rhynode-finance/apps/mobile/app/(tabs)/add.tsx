import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { QuickAddForm } from '~/components/features/quick-add-form';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

export default function AddTab() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const merchant = typeof params.merchant === 'string' ? params.merchant : undefined;
  const total = typeof params.total === 'string' ? params.total : undefined;
  const date = typeof params.date === 'string' ? params.date : undefined;
  const type = params.type === 'INCOME' || params.type === 'EXPENSE' ? params.type : undefined;
  const category = typeof params.category === 'string' ? params.category : undefined;
  const transactionId = typeof params.transactionId === 'string' ? params.transactionId : undefined;
  const currency = typeof params.currency === 'string' ? params.currency : undefined;

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Text className="text-foreground text-2xl font-bold mb-6">
        {transactionId ? t('transactions.form.editTitle') : t('transactions.form.addTitle')}
      </Text>
      <QuickAddForm
        initialMerchant={merchant}
        initialTotal={total}
        initialDate={date}
        initialType={type}
        initialCategory={category}
        transactionId={transactionId}
        initialCurrency={currency}
      />
    </View>
  );
}
