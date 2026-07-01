import { Tabs } from 'expo-router';
import { Home, List, PlusCircle, Target, Menu } from 'lucide-react-native';
import { useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '~/theme/colors';

export default function TabsLayout() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const tint = colors.primary;
  const barBg = scheme === 'dark' ? '#0A0A0F' : '#ffffff';
  const inactive = '#6b7280';

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
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('common.tabs.transactions'),
          tabBarIcon: ({ color, size }) => <List color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: t('common.tabs.add'),
          tabBarIcon: ({ color, size }) => <PlusCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: t('common.tabs.plan'),
          tabBarIcon: ({ color, size }) => <Target color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('common.tabs.more'),
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
