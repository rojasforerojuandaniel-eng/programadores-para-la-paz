import { TrendingUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from './view';
import { Text } from './text';
import { cn } from '~/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizes = {
  sm: { box: 'h-8 w-8', icon: 'h-4 w-4', text: 'text-lg' },
  md: { box: 'h-10 w-10', icon: 'h-5 w-5', text: 'text-xl' },
  lg: { box: 'h-14 w-14', icon: 'h-7 w-7', text: 'text-2xl' },
};

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const { t } = useTranslation();
  const s = sizes[size];
  return (
    <View className={cn('flex-row items-center gap-3', className)}>
      <View
        className={cn(
          'items-center justify-center rounded-xl bg-primary',
          s.box
        )}
      >
        <TrendingUp className={cn('text-primary-foreground', s.icon)} />
      </View>
      {showText ? (
        <Text className={cn('font-bold tracking-tight text-foreground', s.text)}>
          {t('common.appName')}
        </Text>
      ) : null}
    </View>
  );
}
