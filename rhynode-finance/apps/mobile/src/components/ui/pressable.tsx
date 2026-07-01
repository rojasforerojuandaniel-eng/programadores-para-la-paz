import { Pressable as RNPressable, type PressableProps } from 'react-native';
import { cssInterop } from 'nativewind';
import { cn } from '~/lib/utils';

type StyledPressableProps = PressableProps & { className?: string };

const StyledPressable = cssInterop(RNPressable, { className: 'style' }) as React.ComponentType<StyledPressableProps>;

export function Pressable({ className, ...props }: StyledPressableProps) {
  return (
    <StyledPressable
      className={cn('min-h-[48px] min-w-[48px] justify-center', className)}
      {...props}
    />
  );
}
