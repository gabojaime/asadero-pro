"use client";

import type { MonoChartTheme } from "../mono-chart-theme";
import { MONO_FLAME, monoSurface } from "../mono-chart-theme";

export interface MonoHeatmapCell {
  dayOfWeek: number;
  hour: number;
  count: number;
}

export interface MonoRoundedHeatmapChartProps {
  cells: MonoHeatmapCell[];
  theme?: MonoChartTheme;
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function MonoRoundedHeatmapChart({
  cells,
  theme = "light",
}: MonoRoundedHeatmapChartProps) {
  const peak = Math.max(...cells.map((cell) => cell.count), 1);

  return (
    <div
      className="min-h-[290px] w-full overflow-x-auto rounded-xl border border-border p-4"
      style={{ background: monoSurface(theme) }}
    >
      <div className="grid grid-cols-[48px_repeat(24,minmax(12px,1fr))] gap-1 text-[10px]">
        <div />
        {Array.from({ length: 24 }, (_, hour) => (
          <div key={`h-${hour}`} className="text-center text-muted-foreground">
            {hour}
          </div>
        ))}
        {DAY_LABELS.map((label, dow) => (
          <div key={label} className="contents">
            <div className="pr-1 text-muted-foreground">{label}</div>
            {Array.from({ length: 24 }, (_, hour) => {
              const cell = cells.find(
                (item) => item.dayOfWeek === dow && item.hour === hour,
              );
              const intensity = (cell?.count ?? 0) / peak;
              return (
                <div
                  key={`${dow}-${hour}`}
                  title={`${cell?.count ?? 0} sesiones`}
                  className="aspect-square rounded-sm"
                  style={{
                    background:
                      intensity === 0
                        ? "#f4f4f5"
                        : `color-mix(in srgb, ${MONO_FLAME} ${Math.round(intensity * 100)}%, #f4f4f5)`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
