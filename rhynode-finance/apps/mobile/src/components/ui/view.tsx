import { View as RNView } from 'react-native';
import { cssInterop } from 'nativewind';

export const View = cssInterop(RNView, { className: 'style' });
