import { RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { FolderOpen } from 'lucide-react-native';
import { formatCurrency } from '@rhynode/shared';
import { EmptyState } from '~/components/ui/empty-state';
import { Pressable } from '~/components/ui/pressable';
import { Skeleton, SkeletonGroup } from '~/components/ui/skeleton';
import { ScrollView } from '~/components/ui/scroll-view';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { useBusinessData } from '~/hooks/use-business-data';

interface Project {
  id: string;
  name: string;
  budget: number | null;
  currency: string;
  status: string;
}

export default function ProjectsScreen() {
  const router = useRouter();
  const { data, isLoading, refetch } = useBusinessData<{ projects: Project[] }>('projects');

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 24 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#10b981" />}
    >
      <Pressable onPress={() => router.back()} className="mb-4">
        <Text className="text-primary">← Volver</Text>
      </Pressable>
      <Text className="text-foreground text-2xl font-bold mb-4">Proyectos</Text>

      {isLoading && !data ? (
        <SkeletonGroup>
          <Skeleton variant="card" className="h-24" />
          <Skeleton variant="card" className="h-24" />
          <Skeleton variant="card" className="h-24" />
        </SkeletonGroup>
      ) : data?.projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No hay proyectos aún"
          subtitle="Crea tu primer proyecto para organizar tus facturas."
        />
      ) : (
        data?.projects.map((project) => (
          <View key={project.id} className="bg-card rounded-2xl p-4 mb-3">
            <Text className="text-foreground font-medium">{project.name}</Text>
            <Text className="text-muted-foreground text-sm capitalize">
              {project.status.toLowerCase()}
            </Text>
            {project.budget ? (
              <Text className="text-foreground text-lg font-bold mt-1">
                {formatCurrency(project.budget, project.currency, 'es')}
              </Text>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}
