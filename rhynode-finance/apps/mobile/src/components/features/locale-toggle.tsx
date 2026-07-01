import { useTranslation } from 'react-i18next';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import i18n from '~/lib/i18n';
import { cn } from '~/lib/utils';

type LocaleOption = {
  value: 'es' | 'en';
  labelKey: 'settings.language.es' | 'settings.language.en';
};

export function LocaleToggle() {
  const { t } = useTranslation();
  const currentLanguage = i18n.language;

  const options: LocaleOption[] = [
    { value: 'es', labelKey: 'settings.language.es' },
    { value: 'en', labelKey: 'settings.language.en' },
  ];

  return (
    <View className="flex-row gap-2">
      {options.map((option) => {
        const isActive = currentLanguage.startsWith(option.value);

        return (
          <Pressable
            key={option.value}
            onPress={() => void i18n.changeLanguage(option.value)}
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
