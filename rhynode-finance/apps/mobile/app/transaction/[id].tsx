import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Alert, Share } from 'react-native';
import { formatCurrency, formatDate } from '@rhynode/shared';
import { TransactionActions } from '~/components/features/transaction-actions';
import { Button } from '~/components/ui/button';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
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
  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      <ActivityIndicator color="#10b981" />
      <Text className="text-muted-foreground mt-4">Cargando movimiento...</Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Text className="text-destructive text-base mb-4">{message}</Text>
      <Button onPress={onRetry} testID="retry-button">
        <Text className="text-primary-foreground font-semibold">Reintentar</Text>
      </Button>
    </View>
  );
}

function NotFoundState({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Text className="text-foreground text-2xl font-bold mb-2">Movimiento no encontrado</Text>
      <Text className="text-muted-foreground mb-6">El movimiento que buscas no existe o fue eliminado.</Text>
      <Button onPress={onBack} testID="not-found-back">
        <Text className="text-primary-foreground font-semibold">Volver</Text>
      </Button>
    </View>
  );
}

export default function TransactionDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = useMemo(() => (typeof rawId === 'string' ? rawId : undefined), [rawId]);
  const router = useRouter();
  const { data: transaction, isLoading, error, refetch } = useTransaction(id);
  const deleteMutation = useDeleteTransaction();

  if (isLoading) {
    return <LoadingState />;
  }

  if (error instanceof Error && error.message.includes('404')) {
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
    ? 'Cuenta'
    : transaction.bankAccountName
      ? 'Cuenta bancaria'
      : 'Organización';

  const handleEdit = () => {
    router.push({
      pathname: '/(tabs)/add',
      params: {
        transactionId: transaction.id,
        merchant: transaction.description,
        total: transaction.amount.toString(),
        date: transaction.date,
        type: transaction.type,
        category: transaction.category ?? 'Otros',
        currency: transaction.currency,
      },
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar movimiento',
      `¿Seguro que quieres eliminar "${transaction.description}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(transaction.id, {
              onSuccess: () => {
                showToast('Movimiento eliminado', 'success');
                router.back();
              },
              onError: (deleteError) => {
                const message = deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar';
                showToast(message, 'error');
              },
            });
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    const typeLabel = isIncome ? 'Ingreso' : 'Gasto';
    const message = `${typeLabel}: ${formatCurrency(transaction.amount, transaction.currency, 'es')} - ${transaction.description} (${formatDate(transaction.date, 'es')})`;

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
        accessibilityLabel="Volver atrás"
      >
        <Text className="text-primary text-lg">← Volver</Text>
      </Pressable>

      <Text className="text-foreground text-2xl font-bold mb-6">Detalle del movimiento</Text>

      <View className="bg-card rounded-2xl p-5">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-muted-foreground text-sm">{isIncome ? 'Ingreso' : 'Gasto'}</Text>
          <Text
            className={`text-3xl font-bold tabular-nums ${isIncome ? 'text-success' : 'text-destructive'}`}
          >
            {isIncome ? '+' : '-'} {formatCurrency(transaction.amount, transaction.currency, 'es')}
          </Text>
        </View>

        <DetailRow label="Descripción" value={transaction.description} />
        {transaction.category ? <DetailRow label="Categoría" value={transaction.category} /> : null}
        <DetailRow label="Fecha" value={formatDate(transaction.date, 'es')} />
        <DetailRow label={sourceName} value={sourceLabel} />
        <DetailRow label="Divisa" value={transaction.currency} />
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
