import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, Text } from 'react-native';

import { AnimatePresence, MotiView } from '~/components/ui/moti-view';
import { cn } from '~/lib/utils';
import { type ToastType, useToast } from '~/hooks/use-toast';

const toastStyles: Record<ToastType, string> = {
  success: 'bg-success',
  error: 'bg-destructive',
  info: 'bg-secondary',
};

function ToastItem({ id, message, type }: { id: string; message: string; type: ToastType }) {
  const dismiss = useToast((state) => state.dismiss);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  return (
    <MotiView
      key={id}
      className={cn(
        'absolute top-12 left-6 right-6 z-50 rounded-2xl px-4 py-3 shadow-lg',
        toastStyles[type]
      )}
      from={{ opacity: 0, translateY: -20 }}
      animate={{ opacity: 1, translateY: 0 }}
      exit={{ opacity: 0, translateY: -20 }}
      transition={{ type: 'timing', duration: 200 }}
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      <Pressable onPress={() => dismiss(id)} accessibilityLabel="Descartar notificación">
        <Text className="text-sm font-medium text-primary-foreground">{message}</Text>
      </Pressable>
    </MotiView>
  );
}

export function ToastProvider() {
  const toasts = useToast((state) => state.toasts);

  return (
    <AnimatePresence>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} id={toast.id} message={toast.message} type={toast.type} />
      ))}
    </AnimatePresence>
  );
}
