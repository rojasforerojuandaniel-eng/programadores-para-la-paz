import React, { forwardRef } from 'react';
import { TextInput as RNTextInput, type TextInputProps as RNTextInputProps } from 'react-native';
import { cssInterop } from 'nativewind';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { cn } from '~/lib/utils';

type StyledTextInputProps = RNTextInputProps & { className?: string };
type TextInputProps = RNTextInputProps & {
  className?: string;
  label: string;
};

const StyledTextInput = cssInterop(RNTextInput, { className: 'style' }) as React.ForwardRefExoticComponent<
  StyledTextInputProps & React.RefAttributes<RNTextInput>
>;

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
  { className, label, ...props },
  ref
) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-medium text-muted-foreground" accessibilityLabel={label}>
        {label}
      </Text>
      <StyledTextInput
        ref={ref}
        className={cn(
          'min-h-[48px] bg-card text-foreground rounded-2xl px-4 py-3',
          className
        )}
        accessibilityLabel={label}
        {...props}
      />
    </View>
  );
});
