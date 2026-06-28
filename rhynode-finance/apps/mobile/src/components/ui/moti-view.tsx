import { cssInterop } from 'nativewind';
import { MotiView as BaseMotiView } from 'moti';

type BaseMotiViewProps = React.ComponentPropsWithRef<typeof BaseMotiView>;

type MotiViewProps = BaseMotiViewProps & {
  className?: string;
};

export const MotiView = cssInterop(BaseMotiView, { className: 'style' }) as React.ComponentType<MotiViewProps>;

export { AnimatePresence } from 'moti';
