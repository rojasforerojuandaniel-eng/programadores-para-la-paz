import { useEffect, useMemo } from 'react';
import { Animated } from 'react-native';
import { View } from '~/components/ui/view';
import { cn } from '~/lib/utils';
import { useReducedMotion } from '~/hooks/use-reduced-motion';

type SkeletonVariant = 'line' | 'circle' | 'card';

interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
}

const variantClasses: Record<SkeletonVariant, string> = {
  line: 'h-4 w-full rounded-md bg-muted',
  circle: 'h-12 w-12 rounded-full bg-muted',
  card: 'h-24 w-full rounded-2xl bg-card',
};

export function Skeleton({ variant = 'line', className }: SkeletonProps) {
  const reducedMotion = useReducedMotion();
  const pulse = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulse, reducedMotion]);

  return (
    <Animated.View
      style={reducedMotion ? undefined : { opacity: pulse }}
      accessibilityState={{ busy: true }}
      accessibilityLabel="Cargando"
      aria-busy
    >
      <View className={cn(variantClasses[variant], className)} />
    </Animated.View>
  );
}

interface SkeletonGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function SkeletonGroup({ children, className }: SkeletonGroupProps) {
  return <View className={cn('gap-3', className)}>{children}</View>;
}
