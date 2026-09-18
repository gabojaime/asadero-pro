"use client";

import { MonoRoundedLineChart } from "@/components/ui/mono-rounded-line";
import { MONO_FLAME } from "@/components/ui/mono-chart-theme";
import type { DashboardSnapshot } from "../../domain/entities";

export function FoodCostTrendChartPanel({
  snapshot,
}: {
  snapshot: Pick<
    DashboardSnapshot,
    "foodCostDailySeries" | "settings" | "foodCostAlert"
  >;
}) {
  const target = snapshot.settings.targetFoodCostPct * 100;
  return (
    <MonoRoundedLineChart
      data={snapshot.foodCostDailySeries.map((point) => ({
        label: point.label,
        value: point.value,
      }))}
      targetLine={target}
      accentColor={
        snapshot.foodCostAlert === "alert" ? MONO_FLAME : undefined
      }
      valueFormatter={(value) => `${value.toFixed(1)}%`}
    />
  );
}
