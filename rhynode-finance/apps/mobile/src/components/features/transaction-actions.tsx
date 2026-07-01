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
  return (
    <View className="flex-row gap-3 mt-6">
      <Button
        onPress={onEdit}
        disabled={disabled}
        variant="secondary"
        className="flex-1"
        accessibilityLabel="Editar movimiento"
      >
        <Text className="text-secondary-foreground font-semibold">Editar</Text>
      </Button>
      <Button
        onPress={onDelete}
        disabled={disabled}
        variant="destructive"
        className="flex-1"
        accessibilityLabel="Eliminar movimiento"
      >
        <Text className="text-destructive-foreground font-semibold">Eliminar</Text>
      </Button>
      <Button
        onPress={onShare}
        disabled={disabled}
        variant="default"
        className="flex-1"
        accessibilityLabel="Compartir movimiento"
      >
        <Text className="text-primary-foreground font-semibold">Compartir</Text>
      </Button>
    </View>
  );
}
