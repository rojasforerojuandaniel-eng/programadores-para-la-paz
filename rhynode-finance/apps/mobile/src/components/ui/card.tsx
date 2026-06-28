import { View as RNView, type ViewProps as RNViewProps } from 'react-native';
import { cssInterop } from 'nativewind';
import { cn } from '~/lib/utils';

type ViewProps = RNViewProps & { className?: string };

const StyledView = cssInterop(RNView, { className: 'style' }) as React.ComponentType<ViewProps>;

export function Card({ className, children, ...props }: ViewProps) {
  return (
    <StyledView className={cn('rounded-3xl bg-card p-5', className)} {...props}>
      {children}
    </StyledView>
  );
}
