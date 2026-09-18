export const DASHBOARD_TIMEZONE = "America/Caracas";

export const DASHBOARD_PERIODS = [
  "today",
  "last_7_days",
  "month_to_date",
] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export type MetricAlertLevel = "neutral" | "success" | "alert";

export interface PeriodBounds {
  period: DashboardPeriod;
  startIso: string;
  endIso: string;
  dayKeys: string[];
  daysInPeriod: number;
  monthToDateDaysElapsed: number;
  daysInMonth: number;
}

export interface MerchantDashboardSettings {
  targetFoodCostPct: number;
  monthlyFixedOverhead: number | null;
  seatingTableCount: number | null;
}

export interface TimeSeriesPoint {
  dayKey: string;
  label: string;
  value: number;
}

export interface RankedPlateContribution {
  menuItemId: string;
  name: string;
  proteinGroup: string | null;
  weightLabel: string | null;
  marginDollars: number;
  isNegative: boolean;
}

export interface WasteMixSegment {
  reason: string;
  label: string;
  weightKg: number;
}

export interface HeatmapCell {
  dayOfWeek: number;
  hour: number;
  count: number;
}

export interface DashboardSnapshot {
  period: DashboardPeriod;
  periodLabel: string;
  settings: MerchantDashboardSettings;
  netSales: number;
  completedOrderCount: number;
  ingredientCostConsumed: number;
  loggedWasteCost: number;
  totalVariableCost: number;
  foodCostPct: number | null;
  foodCostAlert: MetricAlertLevel;
  foodCostCaption: string;
  foodCostDailySeries: TimeSeriesPoint[];
  contributionRanking: RankedPlateContribution[];
  bepRevenue: number | null;
  bepProgressPct: number | null;
  bepCaption: string;
  bepPortionsRemaining: number | null;
  bepPortionsCaption: string;
  wastePct: number | null;
  wasteAlert: MetricAlertLevel;
  wasteCaption: string;
  wasteMix: WasteMixSegment[];
  averageTicket: number | null;
  averageTicketCaption: string;
  averageTicketDailySeries: TimeSeriesPoint[];
  ticketTimeMedian: number | null;
  ticketTimeP90: number | null;
  ticketTimeAlert: MetricAlertLevel;
  ticketTimeCaption: string;
  ticketTimeDailyMedianSeries: TimeSeriesPoint[];
  sessionHeatmap: HeatmapCell[];
  heatmapCaption: string;
  turnoverByDayOfWeek: TimeSeriesPoint[];
  turnoverCaption: string;
  meatPlatePortionsSold: number;
}
