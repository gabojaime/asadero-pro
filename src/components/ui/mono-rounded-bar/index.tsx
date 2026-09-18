"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonoChartPoint, MonoChartTheme } from "../mono-chart-theme";
import { MONO_FLAME, MONO_INK, MONO_MUTED, monoSurface } from "../mono-chart-theme";

export interface MonoRoundedBarChartProps {
  data: MonoChartPoint[];
  theme?: MonoChartTheme;
  layout?: "vertical" | "horizontal";
  accentColor?: string;
  highlightNegative?: boolean;
  negativeLabels?: string[];
  valueFormatter?: (value: number) => string;
}

export function MonoRoundedBarChart({
  data,
  theme = "light",
  layout = "vertical",
  accentColor = MONO_INK,
  highlightNegative = false,
  negativeLabels = [],
  valueFormatter = (value) => String(value),
}: MonoRoundedBarChartProps) {
  const chartData = data.map((point) => ({
    name: point.label,
    value: point.value,
    fill:
      highlightNegative && negativeLabels.includes(point.label)
        ? MONO_FLAME
        : accentColor,
  }));

  const isHorizontal = layout === "horizontal";

  return (
    <div
      className="min-h-[290px] min-w-0 max-w-full w-full rounded-xl border border-border p-4"
      style={{ background: monoSurface(theme) }}
    >
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={chartData}
          layout={isHorizontal ? "vertical" : "horizontal"}
          margin={{ left: isHorizontal ? 80 : 8, right: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
          {isHorizontal ? (
            <>
              <XAxis type="number" tick={{ fill: MONO_MUTED, fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: MONO_MUTED, fontSize: 11 }}
                width={72}
              />
            </>
          ) : (
            <>
              <XAxis dataKey="name" tick={{ fill: MONO_MUTED, fontSize: 11 }} />
              <YAxis tick={{ fill: MONO_MUTED, fontSize: 11 }} width={36} />
            </>
          )}
          <Tooltip
            formatter={(value) =>
              valueFormatter(typeof value === "number" ? value : Number(value))
            }
          />
          <Bar dataKey="value" radius={[8, 8, 8, 8]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
