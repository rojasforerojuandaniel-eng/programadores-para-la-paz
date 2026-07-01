import React from 'react';
import { Pressable as RNPressable, type PressableProps } from 'react-native';
import { cssInterop } from 'nativewind';
import { cn } from '~/lib/utils';

type StyledPressableProps = PressableProps & { className?: string; loading?: boolean };

const StyledPressable = cssInterop(RNPressable, { className: 'style' }) as React.ComponentType<StyledPressableProps>;

export function Pressable({
  className,
  disabled,
  loading = false,
  children,
  accessibilityLabel,
  accessibilityState,
  ...props
}: StyledPressableProps) {
  return (
    <StyledPressable
      className={cn('min-h-[48px] min-w-[48px] justify-center', className)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled ?? false, busy: loading, ...accessibilityState }}
      accessibilityLabel={accessibilityLabel}
      {...props}
    >
      {children}
    </StyledPressable>
  );
}
