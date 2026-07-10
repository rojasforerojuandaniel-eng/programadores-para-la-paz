import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { useBusinessData } from '~/hooks/use-business-data';
import { localizedFormatCurrency } from '~/lib/i18n-locale';

export default function ProjectsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading } = useBusinessData('projects');

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Pressable onPress={() => router.back()} className="mb-4">
        <Text className="text-primary">{t('common.actions.back')}</Text>
      </Pressable>
      <Text className="text-foreground text-2xl font-bold mb-4">{t('dashboard.projectsTitle')}</Text>

      {isLoading ? <Text className="text-muted-foreground">{t('common.loading')}</Text> : null}

      {data?.projects.map((project) => (
        <View key={project.id} className="bg-card rounded-2xl p-4 mb-3">
          <Text className="text-foreground font-medium">{project.name}</Text>
          <Text className="text-muted-foreground text-sm capitalize">
            {t(`dashboard.status.${project.status.toLowerCase()}`, { defaultValue: project.status.toLowerCase() })}
          </Text>
          {project.budget ? (
            <Text className="text-foreground text-lg font-bold mt-1">
              {localizedFormatCurrency(project.budget, project.currency)}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
