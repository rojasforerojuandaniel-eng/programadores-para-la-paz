import { cssInterop } from 'nativewind';
import { KeyboardAvoidingView as RNKeyboardAvoidingView } from 'react-native';

export const KeyboardAvoidingView = cssInterop(RNKeyboardAvoidingView, {
  className: 'style',
});
