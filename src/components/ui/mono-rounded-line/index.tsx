"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonoChartPoint, MonoChartTheme } from "../mono-chart-theme";
import { MONO_INK, MONO_MUTED, monoSurface } from "../mono-chart-theme";

export interface MonoRoundedLineChartProps {
  data: MonoChartPoint[];
  theme?: MonoChartTheme;
  accentColor?: string;
  valueFormatter?: (value: number) => string;
  targetLine?: number;
}

export function MonoRoundedLineChart({
  data,
  theme = "light",
  accentColor = MONO_INK,
  valueFormatter = (value) => String(value),
  targetLine,
}: MonoRoundedLineChartProps) {
  const chartData = data.map((point) => ({
    name: point.label,
    value: point.value,
    target: targetLine,
  }));

  return (
    <div
      className="min-h-[290px] min-w-0 max-w-full w-full rounded-xl border border-border p-4"
      style={{ background: monoSurface(theme) }}
    >
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <XAxis dataKey="name" tick={{ fill: MONO_MUTED, fontSize: 11 }} />
          <YAxis tick={{ fill: MONO_MUTED, fontSize: 11 }} width={36} />
          <Tooltip
            formatter={(value) =>
              valueFormatter(typeof value === "number" ? value : Number(value))
            }
          />
          {targetLine !== undefined ? (
            <Line
              type="monotone"
              dataKey="target"
              stroke={MONO_MUTED}
              strokeDasharray="4 4"
              dot={false}
              strokeWidth={1}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="value"
            stroke={accentColor}
            strokeWidth={2.5}
            dot={false}
            strokeLinecap="round"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
