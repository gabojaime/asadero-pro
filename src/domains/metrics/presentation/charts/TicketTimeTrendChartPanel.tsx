"use client";

import { MonoRoundedBarChart } from "@/components/ui/mono-rounded-bar";
import { MONO_FLAME } from "@/components/ui/mono-chart-theme";
import type { DashboardSnapshot } from "../../domain/entities";

export function TicketTimeTrendChartPanel({
  snapshot,
}: {
  snapshot: Pick<
    DashboardSnapshot,
    "ticketTimeDailyMedianSeries" | "ticketTimeAlert"
  >;
}) {
  return (
    <MonoRoundedBarChart
      data={snapshot.ticketTimeDailyMedianSeries.map((point) => ({
        label: point.label,
        value: point.value,
      }))}
      accentColor={
        snapshot.ticketTimeAlert === "alert" ? MONO_FLAME : undefined
      }
      valueFormatter={(value) => `${value.toFixed(0)} min`}
    />
  );
}
