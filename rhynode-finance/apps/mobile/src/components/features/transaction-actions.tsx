import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

interface TransactionActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  disabled?: boolean;
}

export function TransactionActions({ onEdit, onDelete, onShare, disabled }: TransactionActionsProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row gap-3 mt-6">
      <Button
        onPress={onEdit}
        disabled={disabled}
        variant="secondary"
        className="flex-1"
        accessibilityLabel={t('a11y.transactionActions.edit')}
      >
        <Text className="text-secondary-foreground font-semibold">{t('transactions.actions.edit')}</Text>
      </Button>
      <Button
        onPress={onDelete}
        disabled={disabled}
        variant="destructive"
        className="flex-1"
        accessibilityLabel={t('a11y.transactionActions.delete')}
      >
        <Text className="text-destructive-foreground font-semibold">{t('transactions.actions.delete')}</Text>
      </Button>
      <Button
        onPress={onShare}
        disabled={disabled}
        variant="default"
        className="flex-1"
        accessibilityLabel={t('a11y.transactionActions.share')}
      >
        <Text className="text-primary-foreground font-semibold">{t('transactions.actions.share')}</Text>
      </Button>
    </View>
  );
}
