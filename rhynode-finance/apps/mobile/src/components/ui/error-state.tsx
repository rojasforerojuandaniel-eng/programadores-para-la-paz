import { AlertTriangle } from 'lucide-react-native';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

interface ErrorStateProps {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  error?: Error | null | unknown;
}

function formatErrorDetail(error: Error | null | unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return '';
}

export function ErrorState({
  title = 'No pudimos cargar tus datos',
  message,
  retryLabel = 'Reintentar',
  onRetry,
  error,
}: ErrorStateProps) {
  const errorDetail = error ? formatErrorDetail(error) : '';

  return (
    <View
      className="items-center justify-center px-6 py-10"
      accessibilityRole="alert"
      accessibilityLabel={title}
    >
      <AlertTriangle size={48} color="#ef4444" strokeWidth={1.5} />
      <Text className="text-foreground text-lg font-semibold mt-4 text-center">{title}</Text>
      <Text className="text-muted-foreground text-sm mt-1 text-center">{message}</Text>
      {errorDetail ? (
        <Text className="text-muted-foreground/70 text-xs mt-2 text-center" accessibilityLabel={`Código de error: ${errorDetail}`}>
          {errorDetail}
        </Text>
      ) : null}
      {onRetry ? (
        <Button onPress={onRetry} className="mt-6" accessibilityLabel={retryLabel}>
          <Text className="text-primary-foreground font-semibold">{retryLabel}</Text>
        </Button>
      ) : null}
    </View>
  );
}
