import { MotiView as BaseMotiView } from 'moti';
import { TwComponent } from '~/lib/tw';

type BaseMotiViewProps = React.ComponentPropsWithRef<typeof BaseMotiView>;

type MotiViewProps = BaseMotiViewProps & {
  className?: string;
};

export const MotiView = TwComponent(BaseMotiView) as React.ComponentType<MotiViewProps>;

export { AnimatePresence } from 'moti';
