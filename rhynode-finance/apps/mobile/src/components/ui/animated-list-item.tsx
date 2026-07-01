import { View } from '~/components/ui/view';
import { MotiView } from '~/components/ui/moti-view';
import { useReducedMotion } from '~/hooks/use-reduced-motion';

interface AnimatedListItemProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
}

export function AnimatedListItem({ children, index = 0, className }: AnimatedListItemProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <View className={className}>{children}</View>;
  }

  return (
    <MotiView
      className={className}
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      exit={{ opacity: 0, translateY: -8 }}
      transition={{
        type: 'timing',
        duration: 350,
        delay: index * 60,
      }}
    >
      {children}
    </MotiView>
  );
}
