"use client";

import { MonoRoundedBarChart } from "@/components/ui/mono-rounded-bar";
import type { DashboardSnapshot } from "../../domain/entities";

export function ContributionRankChartPanel({
  snapshot,
}: {
  snapshot: Pick<DashboardSnapshot, "contributionRanking">;
}) {
  if (snapshot.contributionRanking.length === 0) {
    return (
      <p className="min-h-[290px] rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        No se vendieron platos fuertes en el periodo.
      </p>
    );
  }

  const negativeLabels = snapshot.contributionRanking
    .filter((row) => row.isNegative)
    .map((row) => row.name);

  return (
    <MonoRoundedBarChart
      layout="horizontal"
      data={snapshot.contributionRanking.map((row) => ({
        label: row.name,
        value: row.marginDollars,
      }))}
      highlightNegative
      negativeLabels={negativeLabels}
      valueFormatter={(value) => `$${value.toFixed(0)}`}
    />
  );
}
