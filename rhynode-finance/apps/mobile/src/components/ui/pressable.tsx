import { Pressable as RNPressable, type PressableProps } from 'react-native';
import { cssInterop } from 'nativewind';

type StyledPressableProps = PressableProps & { className?: string };

export const Pressable = cssInterop(RNPressable, { className: 'style' }) as React.ComponentType<StyledPressableProps>;
