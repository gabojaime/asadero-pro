"use client";

import { MonoRoundedGaugeArc } from "@/components/ui/mono-rounded-gauge-arc";
import type { DashboardSnapshot } from "../../domain/entities";

export function BepGaugeChartPanel({
  snapshot,
}: {
  snapshot: Pick<DashboardSnapshot, "bepProgressPct" | "bepCaption">;
}) {
  if (snapshot.bepProgressPct === null) {
    return (
      <p className="min-h-[290px] rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        {snapshot.bepCaption}
      </p>
    );
  }

  return (
    <MonoRoundedGaugeArc
      progressPct={snapshot.bepProgressPct}
      label={snapshot.bepCaption}
    />
  );
}
