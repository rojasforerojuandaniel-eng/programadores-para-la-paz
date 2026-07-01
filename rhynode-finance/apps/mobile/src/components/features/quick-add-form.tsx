import { useRef, useState } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import * as Localization from 'expo-localization';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { TextInput } from '~/components/ui/text-input';
import { View } from '~/components/ui/view';
import { hapticImpact } from '~/lib/haptics';
import { parseLocaleAmount } from '~/lib/parse-amount';
import { showToast } from '~/hooks/use-toast';
import { useCreateTransaction } from '~/hooks/use-transactions';
import { useUpdateTransaction } from '~/hooks/use-transaction';
import { CategoryPicker } from './category-picker';

interface QuickAddFormProps {
  initialMerchant?: string;
  initialTotal?: string;
  initialDate?: string;
  initialType?: 'INCOME' | 'EXPENSE';
  initialCategory?: string;
  transactionId?: string;
  initialCurrency?: string;
}

function initialDateString(date?: string) {
  if (!date) return new Date().toISOString();
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function isOfflineError(error: unknown): error is { name: 'OfflineError'; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'OfflineError'
  );
}

export function QuickAddForm({
  initialMerchant,
  initialTotal,
  initialDate,
  initialType,
  initialCategory,
  transactionId,
  initialCurrency,
}: QuickAddFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(initialType ?? 'EXPENSE');
  const [description, setDescription] = useState(initialMerchant ?? '');
  const [amount, setAmount] = useState(initialTotal ?? '');
  const [category, setCategory] = useState(initialCategory ?? t('transactions.categories.other'));
  const [date] = useState(initialDateString(initialDate));
  const [currency] = useState(initialCurrency ?? 'COP');
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const amountRef = useRef<RNTextInput>(null);

  const selectType = (next: 'INCOME' | 'EXPENSE') => {
    setType(next);
    void hapticImpact();
  };

  const onSubmit = () => {
    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      showToast(t('errors.validation.descriptionRequired'), 'error');
      return;
    }

    const value = parseLocaleAmount(
      amount,
      Localization.getLocales()[0]?.languageTag ?? 'es-CO'
    );
    if (Number.isNaN(value) || value <= 0) {
      showToast(t('errors.validation.amountInvalid'), 'error');
      return;
    }

    const baseBody = {
      type,
      description: trimmedDescription,
      amount: value,
      currency,
      date,
      category,
    };

    if (transactionId) {
      updateMutation.mutate(
        { transactionId, body: baseBody },
        {
          onSuccess: () => {
            showToast(t('transactions.update.success'), 'success');
            router.back();
          },
          onError: (error) => {
            if (isOfflineError(error)) {
              showToast(t('transactions.update.offlinePending'), 'info');
              return;
            }
            const message = error instanceof Error ? error.message : t('errors.transactions.updateFailed');
            showToast(message, 'error');
          },
        }
      );
      return;
    }

    createMutation.mutate(baseBody, {
      onSuccess: () => {
        setDescription('');
        setAmount('');
        setCategory(t('transactions.categories.other'));
        showToast(t('transactions.create.success'), 'success');
      },
      onError: (error) => {
        if (isOfflineError(error)) {
          showToast(t('transactions.create.offlinePending'), 'info');
          return;
        }
        const message = error instanceof Error ? error.message : t('errors.transactions.createFailed');
        showToast(message, 'error');
      },
    });
  };

  return (
    <View className="gap-4">
      <View className="flex-row gap-4">
        <Button
          onPress={() => selectType('INCOME')}
          className={`flex-1 ${type === 'INCOME' ? 'bg-success' : 'bg-card'}`}
          accessibilityState={{ selected: type === 'INCOME' }}
        >
          <Text className={type === 'INCOME' ? 'text-success-foreground font-semibold' : 'text-foreground'}>{t('transactions.quickAdd.income')}</Text>
        </Button>
        <Button
          onPress={() => selectType('EXPENSE')}
          className={`flex-1 ${type === 'EXPENSE' ? 'bg-destructive' : 'bg-card'}`}
          accessibilityState={{ selected: type === 'EXPENSE' }}
        >
          <Text className={type === 'EXPENSE' ? 'text-destructive-foreground font-semibold' : 'text-foreground'}>{t('transactions.quickAdd.expense')}</Text>
        </Button>
      </View>

      <TextInput
        label={t('transactions.form.descriptionLabel')}
        placeholder={t('transactions.form.descriptionPlaceholder')}
        placeholderTextColor="#6b7280"
        value={description}
        onChangeText={setDescription}
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => amountRef.current?.focus()}
      />

      <TextInput
        ref={amountRef}
        label={t('transactions.form.amountLabel')}
        placeholder={t('transactions.form.amountPlaceholder')}
        placeholderTextColor="#6b7280"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        returnKeyType="done"
        blurOnSubmit
        onSubmitEditing={() => {
          void hapticImpact();
          onSubmit();
        }}
      />

      <CategoryPicker value={category} onChange={setCategory} />

      <Button onPress={onSubmit} disabled={isPending || !description || !amount}>
        <Text className="text-primary-foreground font-semibold">{isPending ? t('common.saving') : t('common.save')}</Text>
      </Button>
    </View>
  );
}
