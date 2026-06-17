import { HeaderSkeleton, TableRowsSkeleton } from "@/components/dashboard/page-skeleton";

export default function RemindersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <HeaderSkeleton titleWidth={48} subtitleWidth={64} />
        <div className="h-10 w-40 animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="surface-elevated-2 space-y-4 rounded-xl p-4 sm:p-5">
        <TableRowsSkeleton rows={5} />
      </div>
    </div>
  );
}
