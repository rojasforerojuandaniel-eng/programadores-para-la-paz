import { ScrollView as RNScrollView, type ScrollViewProps } from 'react-native';
import { cssInterop } from 'nativewind';

type StyledScrollViewProps = ScrollViewProps & { className?: string };

export const ScrollView = cssInterop(RNScrollView, { className: 'style' }) as React.ComponentType<StyledScrollViewProps>;
