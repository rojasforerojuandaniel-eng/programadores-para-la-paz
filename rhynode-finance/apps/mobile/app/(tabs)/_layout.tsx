import { Tabs } from 'expo-router';
import { Home, List, PlusCircle, Target, Menu } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '~/theme/colors';
import { useTheme } from '~/lib/theme';

const tabBarTheme = {
  dark: { background: '#0A0A0F', inactive: '#6b7280' },
  light: { background: '#ffffff', inactive: '#71717a' },
};

export default function TabsLayout() {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const tint = colors.primary;
  const theme = tabBarTheme[resolvedTheme];
  const barBg = theme.background;
  const inactive = theme.inactive;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tint,
        tabBarInactiveTintColor: inactive,
        tabBarStyle: { backgroundColor: barBg, borderTopWidth: 0 },
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('common.tabs.home'),
          tabBarButtonTestID: 'tab-index',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('common.tabs.transactions'),
          tabBarButtonTestID: 'tab-transactions',
          tabBarIcon: ({ color, size }) => <List color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: t('common.tabs.add'),
          tabBarButtonTestID: 'tab-add',
          tabBarIcon: ({ color, size }) => <PlusCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: t('common.tabs.plan'),
          tabBarButtonTestID: 'tab-plan',
          tabBarIcon: ({ color, size }) => <Target color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('common.tabs.more'),
          tabBarButtonTestID: 'tab-more',
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
