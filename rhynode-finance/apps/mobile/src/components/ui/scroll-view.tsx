import { ScrollView as RNScrollView, type ScrollViewProps } from 'react-native';
import { TwComponent } from '~/lib/tw';

type StyledScrollViewProps = ScrollViewProps & { className?: string };

export const ScrollView = TwComponent(RNScrollView) as React.ComponentType<StyledScrollViewProps>;
