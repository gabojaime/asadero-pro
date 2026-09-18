import type { MetricAlertLevel } from "../domain/entities";
import { cn } from "@/lib/utils";

type MetricTileProps = {
  label: string;
  value: string;
  caption: string;
  alert?: MetricAlertLevel;
};

export function MetricTile({ label, value, caption, alert = "neutral" }: MetricTileProps) {
  return (
    <article className="rounded-xl border border-border bg-card p-6">
      <p className="text-[13px] font-semibold tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-[28px] font-bold leading-8 tracking-tight text-foreground">
        {value}
      </p>
      <p
        className={cn(
          "mt-3 text-[11px]",
          alert === "alert" && "text-[#e11d48]",
          alert === "success" && "text-foreground",
          alert === "neutral" && "text-muted-foreground",
        )}
      >
        {caption}
      </p>
    </article>
  );
}
