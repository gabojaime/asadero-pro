import { Skeleton } from "@/shared/presentation/ui/skeleton";

export function DashboardChartSkeleton() {
  return (
    <div className="min-h-[290px] w-full rounded-xl border border-border bg-card p-4">
      <Skeleton className="mb-4 h-4 w-32" />
      <Skeleton className="h-[220px] w-full rounded-lg" />
    </div>
  );
}
