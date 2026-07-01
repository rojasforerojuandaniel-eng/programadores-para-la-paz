import { useRouter } from 'expo-router';
import { FileText, Users, FolderOpen, Brain, Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { colors } from '~/theme/colors';

export default function MoreTab() {
  const { t } = useTranslation();
  const router = useRouter();

  const items = [
    { label: t('common.menu.invoices'), route: '/business/invoices' as const, icon: FileText },
    { label: t('common.menu.clients'), route: '/business/clients' as const, icon: Users },
    { label: t('common.menu.projects'), route: '/business/projects' as const, icon: FolderOpen },
    { label: t('advisor.menuLabel'), route: '/advisor' as const, icon: Brain },
    { label: t('settings.menuLabel'), route: '/settings' as const, icon: Settings },
  ];

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Text className="text-foreground text-2xl font-bold mb-6">{t('common.more.title')}</Text>
      <View className="gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Pressable
              key={item.route}
              onPress={() => router.push(item.route)}
              className="flex-row items-center bg-card rounded-2xl p-4 active:opacity-80"
            >
              <Icon color={colors.primary} size={24} />
              <Text className="text-foreground text-lg font-medium ml-4">{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
