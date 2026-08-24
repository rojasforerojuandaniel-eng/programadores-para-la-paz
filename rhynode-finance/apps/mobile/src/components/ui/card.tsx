import { View as RNView, type ViewProps as RNViewProps } from 'react-native';
import { cn } from '~/lib/utils';
import { TwComponent } from '~/lib/tw';

type ViewProps = RNViewProps & { className?: string };

const StyledView = TwComponent(RNView) as React.ComponentType<ViewProps>;

export function Card({ className, children, ...props }: ViewProps) {
  return (
    <StyledView className={cn('rounded-3xl bg-card p-5', className)} {...props}>
      {children}
    </StyledView>
  );
}
