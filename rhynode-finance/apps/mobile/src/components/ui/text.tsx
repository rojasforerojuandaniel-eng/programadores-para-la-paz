import { Text as RNText } from 'react-native';
import { cssInterop } from 'nativewind';

export const Text = cssInterop(RNText, { className: 'style' });
