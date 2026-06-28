import { useRouter } from 'expo-router';
import { AnimatedListItem } from '~/components/ui/animated-list-item';
import { EmptyState } from '~/components/ui/empty-state';
import { Pressable } from '~/components/ui/pressable';
import { ScrollView } from '~/components/ui/scroll-view';
import { Skeleton, SkeletonGroup } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface PersonalListProps<T> {
  title: string;
  items?: T[];
  isLoading: boolean;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptySubtitle?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
}

export function PersonalList<T>({
  title,
  items,
  isLoading,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
  renderItem,
}: PersonalListProps<T>) {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24 }}>
      <Pressable onPress={() => router.back()} className="mb-4">
        <Text className="text-primary">← Volver</Text>
      </Pressable>
      <Text className="text-foreground text-2xl font-bold mb-4">{title}</Text>

      {isLoading ? (
        <SkeletonGroup>
          <Skeleton variant="card" className="h-24" />
          <Skeleton variant="card" className="h-24" />
          <Skeleton variant="card" className="h-24" />
        </SkeletonGroup>
      ) : items?.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} subtitle={emptySubtitle} />
      ) : (
        items?.map((item, index) => (
          <AnimatedListItem key={index} index={index}>
            {renderItem(item, index)}
          </AnimatedListItem>
        ))
      )}
    </ScrollView>
  );
}
