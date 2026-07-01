import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Alert, Share } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '@rhynode/shared';
import { TransactionActions } from '~/components/features/transaction-actions';
import { Button } from '~/components/ui/button';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { ApiError } from '~/lib/api';
import { useDeleteTransaction, useTransaction } from '~/hooks/use-transaction';
import { showToast } from '~/hooks/use-toast';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-4">
      <Text className="text-muted-foreground text-sm mb-1">{label}</Text>
      <Text className="text-foreground text-base">{value}</Text>
    </View>
  );
}

function LoadingState() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      <ActivityIndicator className="text-success" />
      <Text className="text-muted-foreground mt-4">{t('transactions.loading')}</Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Text className="text-destructive text-base mb-4">{message}</Text>
      <Button onPress={onRetry} testID="retry-button">
        <Text className="text-primary-foreground font-semibold">{t('common.retry')}</Text>
      </Button>
    </View>
  );
}

function NotFoundState({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Text className="text-foreground text-2xl font-bold mb-2">{t('transactions.notFoundTitle')}</Text>
      <Text className="text-muted-foreground mb-6">{t('transactions.notFoundBody')}</Text>
      <Button onPress={onBack} testID="not-found-back">
        <Text className="text-primary-foreground font-semibold">{t('common.actions.backShort')}</Text>
      </Button>
    </View>
  );
}

export default function TransactionDetailScreen() {
  const { t } = useTranslation();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = useMemo(() => (typeof rawId === 'string' ? rawId : undefined), [rawId]);
  const router = useRouter();
  const { data: transaction, isLoading, error, refetch } = useTransaction(id);
  const deleteMutation = useDeleteTransaction();

  if (isLoading) {
    return <LoadingState />;
  }

  if (error instanceof ApiError && error.status === 404) {
    return <NotFoundState onBack={() => router.back()} />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={refetch} />;
  }

  if (!transaction) {
    return <NotFoundState onBack={() => router.back()} />;
  }

  const isIncome = transaction.type === 'INCOME';
  const sourceLabel = transaction.accountName ?? transaction.bankAccountName ?? transaction.organizationName;
  const sourceName = transaction.accountName
    ? t('transactions.accountLabel')
    : transaction.bankAccountName
      ? t('transactions.bankAccountLabel')
      : t('transactions.organizationLabel');

  const handleEdit = () => {
    router.push({
      pathname: '/(tabs)/add',
      params: {
        transactionId: transaction.id,
        merchant: transaction.description,
        total: transaction.amount.toString(),
        date: transaction.date,
        type: transaction.type,
        category: transaction.category ?? t('transactions.defaultCategory'),
        currency: transaction.currency,
      },
    });
  };

  const handleDelete = () => {
    Alert.alert(
      t('transactions.deleteTitle'),
      t('transactions.deleteMessage', { description: transaction.description }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('transactions.deleteConfirm'),
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(transaction.id, {
              onSuccess: () => {
                showToast(t('transactions.deleteSuccess'), 'success');
                router.back();
              },
              onError: (deleteError) => {
                const message = deleteError instanceof Error ? deleteError.message : t('errors.deleteFailed');
                showToast(message, 'error');
              },
            });
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    const typeLabel = isIncome ? t('transactions.income') : t('transactions.expense');
    const message = t('transactions.shareMessage', {
      type: typeLabel,
      amount: formatCurrency(transaction.amount, transaction.currency, 'es'),
      description: transaction.description,
      date: formatDate(transaction.date, 'es'),
    });

    try {
      await Share.share({ message });
    } catch {
      // User cancelled or sharing failed silently.
    }
  };

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Pressable
        onPress={() => router.back()}
        className="mb-4 self-start"
        accessibilityRole="button"
        accessibilityLabel={t('a11y.goBack')}
      >
        <Text className="text-primary text-lg">{t('common.actions.back')}</Text>
      </Pressable>

      <Text className="text-foreground text-2xl font-bold mb-6">{t('transactions.title')}</Text>

      <View className="bg-card rounded-2xl p-5">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-muted-foreground text-sm">{isIncome ? t('transactions.income') : t('transactions.expense')}</Text>
          <Text
            className={`text-3xl font-bold tabular-nums ${isIncome ? 'text-success' : 'text-destructive'}`}
          >
            {isIncome ? '+' : '-'} {formatCurrency(transaction.amount, transaction.currency, 'es')}
          </Text>
        </View>

        <DetailRow label={t('transactions.descriptionLabel')} value={transaction.description} />
        {transaction.category ? <DetailRow label={t('transactions.categoryLabel')} value={transaction.category} /> : null}
        <DetailRow label={t('transactions.dateLabel')} value={formatDate(transaction.date, 'es')} />
        <DetailRow label={sourceName} value={sourceLabel ?? ''} />
        <DetailRow label={t('transactions.currencyLabel')} value={transaction.currency} />
      </View>

      <TransactionActions
        onEdit={handleEdit}
        onDelete={handleDelete}
        onShare={handleShare}
        disabled={deleteMutation.isPending}
      />
    </View>
  );
}
