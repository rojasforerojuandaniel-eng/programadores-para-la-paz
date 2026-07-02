import React from 'react';
import { Linking, Switch, type ColorValue } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { useTheme } from '~/lib/theme';
import { showToast } from '~/hooks/use-toast';

interface SwitchColors {
  trackFalse: ColorValue;
  trackTrue: ColorValue;
  thumb: ColorValue;
  iosBackground: ColorValue;
}

function useSwitchColors(): SwitchColors {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return {
    trackFalse: isDark ? '#26272b' : '#d4d4d8',
    trackTrue: '#047857',
    thumb: '#ffffff',
    iosBackground: isDark ? '#26272b' : '#d4d4d8',
  };
}

export function SettingsSwitch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const colors = useSwitchColors();

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.trackFalse, true: colors.trackTrue }}
      thumbColor={colors.thumb}
      ios_backgroundColor={colors.iosBackground}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
    />
  );
}

export function SettingsRow({
  label,
  description,
  children,
  testID,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  testID?: string;
}) {
  const compoundLabel = description ? `${label}, ${description}` : label;

  return (
    <View
      testID={testID}
      className="flex-row items-center justify-between gap-4 py-3"
      accessibilityRole="button"
      accessibilityLabel={compoundLabel}
      accessible
    >
      <View className="flex-1 gap-1" pointerEvents="none">
        <Text className="text-base font-medium text-foreground">{label}</Text>
        {description && (
          <Text className="text-sm text-muted-foreground">{description}</Text>
        )}
      </View>
      {children}
    </View>
  );
}

export function LegalLink({
  label,
  url,
  errorMessage,
}: {
  label: string;
  url: string;
  errorMessage: string;
}) {
  const handlePress = async () => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      try {
        await Linking.openURL(url);
      } catch {
        showToast(errorMessage, 'error');
      }
    }
  };

  return (
    <Pressable
      onPress={() => void handlePress()}
      accessibilityRole="link"
      accessibilityLabel={label}
      className="flex-row items-center justify-between py-3 active:opacity-70"
    >
      <Text className="text-base text-foreground">{label}</Text>
      <Text className="text-2xl text-muted-foreground">→</Text>
    </Pressable>
  );
}
