import { Text as RNText, type TextProps } from 'react-native';
import { TwComponent } from '~/lib/tw';

export const Text = TwComponent(RNText) as React.ComponentType<TextProps & { className?: string }>;
