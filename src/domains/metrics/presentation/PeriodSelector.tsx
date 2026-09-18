"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DASHBOARD_PERIODS, type DashboardPeriod } from "../domain/entities";
import { cn } from "@/lib/utils";

const LABELS: Record<DashboardPeriod, string> = {
  today: "Hoy",
  last_7_days: "7 días",
  month_to_date: "Mes",
};

export function PeriodSelector({ current }: { current: DashboardPeriod }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setPeriod(period: DashboardPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {DASHBOARD_PERIODS.map((period) => (
        <button
          key={period}
          type="button"
          onClick={() => setPeriod(period)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-[13px] font-semibold",
            current === period
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground",
          )}
        >
          {LABELS[period]}
        </button>
      ))}
    </div>
  );
}
