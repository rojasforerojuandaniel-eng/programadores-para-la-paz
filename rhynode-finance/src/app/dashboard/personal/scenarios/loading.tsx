export default function ScenariosLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
      <div className="h-5 w-72 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-[500px] animate-pulse rounded-xl bg-muted lg:col-span-1" />
        <div className="h-[400px] animate-pulse rounded-xl bg-muted lg:col-span-2" />
      </div>
    </div>
  );
}
