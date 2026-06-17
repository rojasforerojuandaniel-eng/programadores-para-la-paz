export default function ScenariosLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
      <div className="h-5 w-72 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="h-[320px] animate-pulse rounded-xl bg-muted" />
          <div className="h-[280px] animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="h-[400px] animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
