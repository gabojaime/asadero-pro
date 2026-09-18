"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { MonoChartPoint, MonoChartTheme } from "../mono-chart-theme";
import { MONO_INK, monoSurface } from "../mono-chart-theme";

export interface MonoRoundedSparklineChartProps {
  data: MonoChartPoint[];
  theme?: MonoChartTheme;
  accentColor?: string;
}

export function MonoRoundedSparklineChart({
  data,
  theme = "light",
  accentColor = MONO_INK,
}: MonoRoundedSparklineChartProps) {
  const chartData = data.map((point) => ({
    name: point.label,
    value: point.value,
  }));

  return (
    <div
      className="min-h-[120px] min-w-0 max-w-full w-full rounded-xl border border-border p-3"
      style={{ background: monoSurface(theme) }}
    >
      <ResponsiveContainer width="100%" height={90}>
        <LineChart data={chartData}>
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke={accentColor}
            strokeWidth={2}
            dot={false}
            strokeLinecap="round"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
