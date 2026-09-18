"use client";

import { MonoRoundedBarChart } from "@/components/ui/mono-rounded-bar";
import type { DashboardSnapshot } from "../../domain/entities";

export function TurnoverByDowChartPanel({
  snapshot,
}: {
  snapshot: Pick<DashboardSnapshot, "turnoverByDayOfWeek">;
}) {
  return (
    <MonoRoundedBarChart
      data={snapshot.turnoverByDayOfWeek.map((point) => ({
        label: point.label,
        value: point.value,
      }))}
      valueFormatter={(value) => `${value.toFixed(1)} ses/mesa`}
    />
  );
}
