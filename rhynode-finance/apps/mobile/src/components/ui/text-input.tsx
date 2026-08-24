import { TextInput as RNTextInput, type TextInputProps as RNTextInputProps } from 'react-native';
import { TwComponent } from '~/lib/tw';

type TextInputProps = RNTextInputProps & { className?: string };

export const TextInput = TwComponent(RNTextInput) as React.ComponentType<TextInputProps>;
