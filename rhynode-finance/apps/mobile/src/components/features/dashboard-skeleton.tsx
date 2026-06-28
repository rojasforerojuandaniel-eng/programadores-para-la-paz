import { Skeleton, SkeletonGroup } from '~/components/ui/skeleton';
import { View } from '~/components/ui/view';

export function DashboardSkeleton() {
  return (
    <View className="gap-4">
      <Skeleton variant="card" className="h-32" />
      <View className="flex-row gap-4">
        <Skeleton variant="card" className="h-28 flex-1" />
        <Skeleton variant="card" className="h-28 flex-1" />
      </View>
      <Skeleton variant="card" className="h-40" />
      <SkeletonGroup className="mt-2">
        <Skeleton variant="line" />
        <Skeleton variant="line" className="w-2/3" />
      </SkeletonGroup>
    </View>
  );
}
