import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-muted", className)}
      aria-hidden="true"
    />
  );
}

export function AiInsightsCardSkeleton() {
  return (
    <div aria-live="polite" aria-busy="true">
      <span className="sr-only">Cargando insights de IA…</span>
      <Card aria-hidden="true" className="surface-elevated-2 rounded-xl border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-8 w-8 rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <SkeletonBlock className="h-16 w-full rounded-xl sm:w-40" />
            <SkeletonBlock className="h-16 flex-1 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SkeletonBlock className="h-20 rounded-xl" />
            <SkeletonBlock className="h-20 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
