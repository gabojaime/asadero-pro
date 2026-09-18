export type MonoChartTheme = "light" | "dark";

export interface MonoChartPoint {
  label: string;
  value: number;
}

export interface MonoChartSegment {
  label: string;
  value: number;
  color?: string;
}

export const MONO_INK = "#18181b";
export const MONO_MUTED = "#a1a1aa";
export const MONO_FLAME = "#e11d48";

export function monoSurface(theme: MonoChartTheme) {
  return theme === "dark" ? "#18181b" : "#ffffff";
}
