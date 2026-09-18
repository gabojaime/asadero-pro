"use client";

import { MonoRoundedDonutChart } from "@/components/ui/mono-rounded-donut";
import type { DashboardSnapshot } from "../../domain/entities";

export function WasteMixChartPanel({
  snapshot,
}: {
  snapshot: Pick<DashboardSnapshot, "wasteMix" | "wastePct">;
}) {
  if (snapshot.wasteMix.length === 0) {
    return (
      <p className="min-h-[290px] rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Sin mermas registradas en el periodo.
      </p>
    );
  }

  return (
    <MonoRoundedDonutChart
      data={snapshot.wasteMix.map((segment) => ({
        label: segment.label,
        value: segment.weightKg,
      }))}
      centerLabel={
        snapshot.wastePct !== null ? `${snapshot.wastePct.toFixed(1)}%` : undefined
      }
    />
  );
}
