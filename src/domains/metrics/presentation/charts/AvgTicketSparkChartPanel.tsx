"use client";

import { MonoRoundedSparklineChart } from "@/components/ui/mono-rounded-sparkline";
import type { DashboardSnapshot } from "../../domain/entities";

export function AvgTicketSparkChartPanel({
  snapshot,
}: {
  snapshot: Pick<DashboardSnapshot, "averageTicketDailySeries">;
}) {
  return (
    <MonoRoundedSparklineChart
      data={snapshot.averageTicketDailySeries.map((point) => ({
        label: point.label,
        value: point.value,
      }))}
    />
  );
}
