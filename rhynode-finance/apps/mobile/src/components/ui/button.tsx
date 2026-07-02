import React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { cssInterop } from 'nativewind';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/lib/utils';
import { hapticImpact } from '~/lib/haptics';

type StyledPressableProps = PressableProps & { className?: string };

const StyledPressable = cssInterop(Pressable, { className: 'style' }) as React.ComponentType<StyledPressableProps>;

const buttonVariants = cva(
  'min-h-[48px] min-w-[48px] flex-row items-center justify-center rounded-2xl px-5 py-3 active:opacity-90',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        secondary: 'bg-secondary',
        destructive: 'bg-destructive',
        ghost: 'bg-transparent',
      },
      size: {
        default: 'h-12',
        sm: 'h-9 px-3',
        lg: 'h-14 px-6',
        icon: 'h-12 w-12 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends Omit<PressableProps, 'children'>,
    VariantProps<typeof buttonVariants> {
  className?: string;
  children: React.ReactNode;
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  onPress,
  disabled,
  loading = false,
  children,
  accessibilityLabel,
  accessibilityState,
  ...props
}: ButtonProps) {
  const handlePress = (event: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
    if (disabled || loading) return;
    void hapticImpact();
    onPress?.(event);
  };

  return (
    <StyledPressable
      className={cn(buttonVariants({ variant, size }), className)}
      onPress={handlePress}
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
