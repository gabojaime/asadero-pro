"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { MonoChartSegment, MonoChartTheme } from "../mono-chart-theme";
import { monoSurface } from "../mono-chart-theme";

export interface MonoRoundedDonutChartProps {
  data: MonoChartSegment[];
  theme?: MonoChartTheme;
  centerLabel?: string;
}

export function MonoRoundedDonutChart({
  data,
  theme = "light",
  centerLabel,
}: MonoRoundedDonutChartProps) {
  const tones = ["#18181b", "#3f3f46", "#71717a", "#a1a1aa"];

  return (
    <div
      className="relative min-h-[290px] w-full rounded-xl border border-border p-4"
      style={{ background: monoSurface(theme) }}
    >
      {centerLabel ? (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold text-foreground">
          {centerLabel}
        </p>
      ) : null}
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={4}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.label}
                fill={entry.color ?? tones[index % tones.length]}
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-center text-[11px] text-muted-foreground">
        {data.map((row) => row.label).join(" · ")}
      </p>
    </div>
  );
}
