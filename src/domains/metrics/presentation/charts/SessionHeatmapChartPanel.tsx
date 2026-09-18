"use client";

import { MonoRoundedHeatmapChart } from "@/components/ui/mono-rounded-heatmap";
import type { DashboardSnapshot } from "../../domain/entities";

export function SessionHeatmapChartPanel({
  snapshot,
}: {
  snapshot: Pick<DashboardSnapshot, "sessionHeatmap">;
}) {
  return <MonoRoundedHeatmapChart cells={snapshot.sessionHeatmap} />;
}
