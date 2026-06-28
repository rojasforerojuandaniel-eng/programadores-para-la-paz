import { Pressable, type PressableProps } from 'react-native';
import { cssInterop } from 'nativewind';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/lib/utils';

type StyledPressableProps = PressableProps & { className?: string };

const StyledPressable = cssInterop(Pressable, { className: 'style' }) as React.ComponentType<StyledPressableProps>;

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-2xl px-5 py-3 active:opacity-90',
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
}

export function Button({ className, variant, size, children, ...props }: ButtonProps) {
  return (
    <StyledPressable className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </StyledPressable>
  );
}
