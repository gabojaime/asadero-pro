import { Skeleton } from "@/shared/presentation/ui/skeleton";
import { DashboardChartSkeleton } from "./dashboard-chart-skeleton";

export function DashboardPageSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando panel de control"
      className="flex w-full min-w-0 max-w-full flex-col gap-8"
    >
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-10 w-44 rounded-md" />
      </header>

      <Skeleton className="h-14 w-full rounded-xl" />

      <section className="space-y-4">
        <Skeleton className="h-6 w-28" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="rounded-xl border border-border bg-card p-6"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-8 w-20" />
              <Skeleton className="mt-4 h-3 w-full max-w-[180px]" />
            </div>
          ))}
        </div>
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <DashboardChartSkeleton />
          <DashboardChartSkeleton />
        </div>
      </section>

      <section className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <DashboardChartSkeleton />
          <DashboardChartSkeleton />
        </div>
      </section>
    </div>
  );
}
