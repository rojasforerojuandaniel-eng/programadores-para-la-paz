import { useTranslation } from 'react-i18next';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { useTheme } from '~/lib/theme';
import { cn } from '~/lib/utils';

type ThemeOption = {
  value: 'light' | 'dark' | 'system';
  labelKey: 'settings.theme.light' | 'settings.theme.dark' | 'settings.theme.system';
};

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const options: ThemeOption[] = [
    { value: 'light', labelKey: 'settings.theme.light' },
    { value: 'dark', labelKey: 'settings.theme.dark' },
    { value: 'system', labelKey: 'settings.theme.system' },
  ];

  return (
    <View className="flex-row gap-2">
      {options.map((option) => {
        const isActive = theme === option.value;

        return (
          <Pressable
            key={option.value}
            onPress={() => setTheme(option.value)}
            accessibilityLabel={t(option.labelKey)}
            accessibilityState={{ selected: isActive }}
            className={cn(
              'flex-1 items-center justify-center rounded-xl px-3 py-2',
              isActive ? 'bg-primary' : 'bg-secondary'
            )}
          >
            <Text
              className={cn(
                'text-sm font-medium',
                isActive ? 'text-primary-foreground' : 'text-secondary-foreground'
              )}
            >
              {t(option.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
