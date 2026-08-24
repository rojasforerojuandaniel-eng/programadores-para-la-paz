import { View as RNView, type ViewProps } from 'react-native';
import { TwComponent } from '~/lib/tw';

export const View = TwComponent(RNView) as React.ComponentType<ViewProps & { className?: string }>;
