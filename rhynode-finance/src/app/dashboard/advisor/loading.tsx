export default function AdvisorLoading() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="flex-1 animate-pulse rounded-xl bg-muted" />
      <div className="h-20 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
