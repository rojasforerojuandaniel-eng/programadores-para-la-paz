import { HeaderSkeleton, KpiSkeleton, TableRowsSkeleton } from "@/components/dashboard/page-skeleton";

export default function InvestmentsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <HeaderSkeleton titleWidth={48} subtitleWidth={56} />
        <div className="h-10 w-36 animate-pulse rounded-xl bg-muted" />
      </div>
      <KpiSkeleton count={3} columns={3} />
      <div className="surface-elevated-2 space-y-4 rounded-xl p-4 sm:p-5">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <TableRowsSkeleton rows={5} />
      </div>
    </div>
  );
}
