import { KeyboardAvoidingView as RNKeyboardAvoidingView, type KeyboardAvoidingViewProps } from 'react-native';
import { TwComponent } from '~/lib/tw';

type StyledKeyboardAvoidingViewProps = KeyboardAvoidingViewProps & { className?: string };

export const KeyboardAvoidingView = TwComponent(RNKeyboardAvoidingView) as React.ComponentType<StyledKeyboardAvoidingViewProps>;
