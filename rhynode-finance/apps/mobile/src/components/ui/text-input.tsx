import { TextInput as RNTextInput, type TextInputProps as RNTextInputProps } from 'react-native';
import { cssInterop } from 'nativewind';

type TextInputProps = RNTextInputProps & { className?: string };

export const TextInput = cssInterop(RNTextInput, { className: 'style' }) as React.ComponentType<TextInputProps>;
