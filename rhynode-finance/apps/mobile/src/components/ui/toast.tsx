import { useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, MotiView } from '~/components/ui/moti-view';
import { cn } from '~/lib/utils';
import { type ToastType, useToast } from '~/hooks/use-toast';

const DISMISS_DELAY_MS = 4000;

const toastStyles: Record<ToastType, string> = {
  success: 'bg-success',
  error: 'bg-destructive',
  info: 'bg-secondary',
};

function ToastItem({ id, message, type }: { id: string; message: string; type: ToastType }) {
  const { t } = useTranslation();
  const dismiss = useToast((state) => state.dismiss);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const remainingRef = useRef<number>(DISMISS_DELAY_MS);

  const scheduleDismiss = useCallback(
    (delay: number) => {
      startTimeRef.current = Date.now();
      remainingRef.current = delay;
      timerRef.current = setTimeout(() => {
        dismiss(id);
      }, delay);
    },
    [dismiss, id]
  );

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      const elapsed = Date.now() - startTimeRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resumeTimer = useCallback(() => {
    if (!timerRef.current && remainingRef.current > 0) {
      scheduleDismiss(remainingRef.current);
    }
  }, [scheduleDismiss]);

  useEffect(() => {
    scheduleDismiss(DISMISS_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [scheduleDismiss]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  return (
    <MotiView
      className={cn(
        'w-full rounded-2xl px-4 py-3 shadow-lg',
        toastStyles[type]
      )}
      from={{ opacity: 0, translateY: -20, scale: 0.95 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      exit={{ opacity: 0, translateX: 100 }}
      transition={{ type: 'timing', duration: 200 }}
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      <Pressable
        onPress={() => dismiss(id)}
        onPressIn={pauseTimer}
        onPressOut={resumeTimer}
        accessibilityLabel={t('a11y.dismissNotification')}
      >
        <Text className="text-sm font-medium text-primary-foreground">{message}</Text>
      </Pressable>
    </MotiView>
  );
}

export function ToastProvider() {
  const toasts = useToast((state) => state.toasts);

  return (
    <View
      className="absolute top-0 left-0 right-0 z-50 flex-col gap-2 px-6 pt-12"
      pointerEvents="box-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
          />
        ))}
      </AnimatePresence>
    </View>
  );
}
