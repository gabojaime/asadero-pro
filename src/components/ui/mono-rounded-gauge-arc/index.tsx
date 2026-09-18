"use client";

import type { MonoChartTheme } from "../mono-chart-theme";
import { MONO_FLAME, MONO_INK, monoSurface } from "../mono-chart-theme";

export interface MonoRoundedGaugeArcProps {
  progressPct: number;
  theme?: MonoChartTheme;
  label?: string;
}

export function MonoRoundedGaugeArc({
  progressPct,
  theme = "light",
  label,
}: MonoRoundedGaugeArcProps) {
  const clamped = Math.max(0, Math.min(progressPct, 150));
  const angle = (clamped / 150) * 180;

  return (
    <div
      className="flex min-h-[290px] min-w-0 max-w-full w-full flex-col items-center justify-center rounded-xl border border-border p-6"
      style={{ background: monoSurface(theme) }}
    >
      <svg width="220" height="120" viewBox="0 0 220 120" aria-hidden>
        <path
          d="M 20 110 A 90 90 0 0 1 200 110"
          fill="none"
          stroke="#e4e4e7"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M 20 110 A 90 90 0 0 1 200 110"
          fill="none"
          stroke={clamped >= 100 ? MONO_FLAME : MONO_INK}
          strokeWidth="14"
          strokeLinecap="round"
          pathLength={180}
          strokeDasharray={`${angle} 180`}
        />
      </svg>
      <p className="text-[28px] font-bold leading-8 tracking-tight">
        {clamped.toFixed(0)}%
      </p>
      {label ? (
        <p className="text-[11px] text-muted-foreground">{label}</p>
      ) : null}
    </div>
  );
}
