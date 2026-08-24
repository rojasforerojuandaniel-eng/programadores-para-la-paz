import { Pressable as RNPressable, type PressableProps } from 'react-native';
import { TwComponent } from '~/lib/tw';

type StyledPressableProps = PressableProps & { className?: string };

export const Pressable = TwComponent(RNPressable) as React.ComponentType<StyledPressableProps>;
