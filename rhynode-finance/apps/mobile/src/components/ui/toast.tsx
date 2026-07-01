import { Pressable, Text } from 'react-native';

import { AnimatePresence, MotiView } from '~/components/ui/moti-view';
import { cn } from '~/lib/utils';
import { type ToastType, useToast } from '~/hooks/use-toast';

const toastStyles: Record<ToastType, string> = {
  success: 'bg-success',
  error: 'bg-destructive',
  info: 'bg-secondary',
};

export function ToastProvider() {
  const toasts = useToast((state) => state.toasts);
  const dismiss = useToast((state) => state.dismiss);

  return (
    <AnimatePresence>
      {toasts.map((toast) => (
        <MotiView
          key={toast.id}
          className={cn(
            'absolute top-12 left-6 right-6 z-50 rounded-2xl px-4 py-3 shadow-lg',
            toastStyles[toast.type]
          )}
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: -20 }}
          transition={{ type: 'timing', duration: 200 }}
        >
          <Pressable onPress={() => dismiss(toast.id)}>
            <Text className="text-sm font-medium text-primary-foreground">
              {toast.message}
            </Text>
          </Pressable>
        </MotiView>
      ))}
    </AnimatePresence>
  );
}
