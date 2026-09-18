import type { MetricAlertLevel, TimeSeriesPoint } from "./entities";

export const FOOD_COST_ABSOLUTE_CEILING_PCT = 35;
export const FOOD_COST_BAND_TOLERANCE_PP = 2;
export const WASTE_PCT_ALERT_THRESHOLD = 5;
export const TICKET_TIME_MEDIAN_ALERT_MIN = 18;
export const TICKET_TIME_P90_ALERT_MIN = 25;
export const TURNOVER_LOW_THRESHOLD = 0.8;

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundPct(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function calculateNetSales(orderTotals: number[]): number {
  return roundMoney(orderTotals.reduce((sum, value) => sum + value, 0));
}

export function calculateIngredientCostConsumed(
  movements: { quantity: number; unitCost: number }[],
): number {
  return roundMoney(
    movements.reduce((sum, row) => sum + row.quantity * row.unitCost, 0),
  );
}

export function calculateLoggedWasteCost(
  wasteRows: { totalCost: number }[],
): number {
  return roundMoney(wasteRows.reduce((sum, row) => sum + row.totalCost, 0));
}

export function calculateFoodCostPct(
  netSales: number,
  ingredientCostConsumed: number,
  loggedWasteCost: number,
): number | null {
  if (netSales <= 0) {
    return null;
  }
  return roundPct(
    ((ingredientCostConsumed + loggedWasteCost) / netSales) * 100,
  );
}

export function getFoodCostAlertLevel(
  foodCostPct: number | null,
  targetFoodCostPct: number,
): MetricAlertLevel {
  if (foodCostPct === null) {
    return "neutral";
  }
  const targetPct = targetFoodCostPct * 100;
  const upperBand = targetPct + FOOD_COST_BAND_TOLERANCE_PP;
  const lowerBand = targetPct - FOOD_COST_BAND_TOLERANCE_PP;
  if (
    foodCostPct > upperBand ||
    foodCostPct > FOOD_COST_ABSOLUTE_CEILING_PCT
  ) {
    return "alert";
  }
  if (foodCostPct >= lowerBand && foodCostPct <= upperBand) {
    return "success";
  }
  return "neutral";
}

export function calculateWastePct(
  wasteKg: number,
  receiptKg: number,
): number | null {
  if (receiptKg <= 0) {
    return null;
  }
  return roundPct((wasteKg / receiptKg) * 100);
}

export function getWasteAlertLevel(wastePct: number | null): MetricAlertLevel {
  if (wastePct === null) {
    return "neutral";
  }
  if (wastePct >= WASTE_PCT_ALERT_THRESHOLD) {
    return "alert";
  }
  return "success";
}

export function calculateAverageTicket(
  netSales: number,
  completedOrderCount: number,
): number | null {
  if (completedOrderCount <= 0) {
    return null;
  }
  return roundMoney(netSales / completedOrderCount);
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }
  const index = (sortedValues.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return sortedValues[lower];
  }
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

export function calculateTicketTimeStats(minutes: number[]): {
  median: number | null;
  p90: number | null;
} {
  if (minutes.length === 0) {
    return { median: null, p90: null };
  }
  const sorted = [...minutes].sort((a, b) => a - b);
  return {
    median: roundPct(percentile(sorted, 0.5)),
    p90: roundPct(percentile(sorted, 0.9)),
  };
}

export function getTicketTimeAlertLevel(
  median: number | null,
  p90: number | null,
): MetricAlertLevel {
  if (median === null || p90 === null) {
    return "neutral";
  }
  if (
    median > TICKET_TIME_MEDIAN_ALERT_MIN ||
    p90 > TICKET_TIME_P90_ALERT_MIN
  ) {
    return "alert";
  }
  return "success";
}

export function calculateContributionMarginRatio(
  netSales: number,
  totalVariableCost: number,
): number | null {
  if (netSales <= 0) {
    return null;
  }
  const ratio = (netSales - totalVariableCost) / netSales;
  if (ratio <= 0) {
    return null;
  }
  return ratio;
}

export function calculateBepRevenue(
  monthlyFixedOverhead: number,
  contributionMarginRatio: number | null,
): number | null {
  if (contributionMarginRatio === null || contributionMarginRatio <= 0) {
    return null;
  }
  return roundMoney(monthlyFixedOverhead / contributionMarginRatio);
}

export function calculateBepProgressPct(
  netSales: number,
  bepRevenue: number | null,
): number | null {
  if (bepRevenue === null || bepRevenue <= 0) {
    return null;
  }
  return roundPct(Math.min(netSales / bepRevenue, 1.5) * 100);
}

export function calculateAvgContributionPerPortion(
  netSales: number,
  totalVariableCost: number,
  meatPlatePortionsSold: number,
): number | null {
  if (meatPlatePortionsSold <= 0) {
    return null;
  }
  return roundMoney(
    (netSales - totalVariableCost) / meatPlatePortionsSold,
  );
}

export function calculateBepPortions(
  monthlyFixedOverhead: number,
  avgContributionPerPortion: number | null,
): number | null {
  if (avgContributionPerPortion === null || avgContributionPerPortion <= 0) {
    return null;
  }
  return Math.ceil(monthlyFixedOverhead / avgContributionPerPortion);
}

export function calculateTableTurnover(
  sessionCount: number,
  seatingTableCount: number,
  daysInPeriod: number,
): number | null {
  if (seatingTableCount <= 0 || daysInPeriod <= 0) {
    return null;
  }
  return roundPct(sessionCount / seatingTableCount / daysInPeriod);
}

export function bucketSumByDayKey(
  dayKeys: string[],
  rows: { dayKey: string; value: number }[],
): TimeSeriesPoint[] {
  const totals = new Map<string, number>();
  for (const key of dayKeys) {
    totals.set(key, 0);
  }
  for (const row of rows) {
    if (!totals.has(row.dayKey)) {
      continue;
    }
    totals.set(row.dayKey, (totals.get(row.dayKey) ?? 0) + row.value);
  }
  return dayKeys.map((dayKey) => ({
    dayKey,
    label: dayKey.slice(8),
    value: roundMoney(totals.get(dayKey) ?? 0),
  }));
}

export function bucketDailyFoodCostPct(
  dayKeys: string[],
  salesByDay: { dayKey: string; netSales: number }[],
  costByDay: { dayKey: string; cost: number }[],
): TimeSeriesPoint[] {
  const salesMap = new Map(salesByDay.map((row) => [row.dayKey, row.netSales]));
  const costMap = new Map(costByDay.map((row) => [row.dayKey, row.cost]));

  return dayKeys.map((dayKey) => {
    const netSales = salesMap.get(dayKey) ?? 0;
    const cost = costMap.get(dayKey) ?? 0;
    const value =
      netSales > 0 ? roundPct((cost / netSales) * 100) : 0;
    return { dayKey, label: dayKey.slice(8), value };
  });
}

export function bucketDailyAverageTicket(
  dayKeys: string[],
  salesByDay: { dayKey: string; netSales: number; orderCount: number }[],
): TimeSeriesPoint[] {
  const map = new Map(salesByDay.map((row) => [row.dayKey, row]));
  return dayKeys.map((dayKey) => {
    const row = map.get(dayKey);
    const value =
      row && row.orderCount > 0
        ? roundMoney(row.netSales / row.orderCount)
        : 0;
    return { dayKey, label: dayKey.slice(8), value };
  });
}

export function bucketDailyMedian(
  dayKeys: string[],
  minutesByDay: { dayKey: string; minutes: number }[],
): TimeSeriesPoint[] {
  return dayKeys.map((dayKey) => {
    const values = minutesByDay
      .filter((row) => row.dayKey === dayKey)
      .map((row) => row.minutes);
    const { median } = calculateTicketTimeStats(values);
    return {
      dayKey,
      label: dayKey.slice(8),
      value: median ?? 0,
    };
  });
}

export function rankPlateContributions(
  rows: {
    menuItemId: string;
    name: string;
    proteinGroup: string | null;
    weightLabel: string | null;
    marginDollars: number;
  }[],
  limit = 8,
): {
  menuItemId: string;
  name: string;
  proteinGroup: string | null;
  weightLabel: string | null;
  marginDollars: number;
  isNegative: boolean;
}[] {
  const sorted = [...rows].sort((a, b) => b.marginDollars - a.marginDollars);
  const negativeIds = new Set(
    sorted
      .filter((row) => row.marginDollars < 0)
      .slice(0, 2)
      .map((row) => row.menuItemId),
  );
  return sorted.slice(0, limit).map((row) => ({
    ...row,
    isNegative: negativeIds.has(row.menuItemId),
  }));
}

export function buildHeatmapCaption(cells: { count: number }[]): string {
  if (cells.length === 0) {
    return "";
  }
  const peak = Math.max(...cells.map((cell) => cell.count), 0);
  if (peak === 0) {
    return "Sin sesiones registradas en el periodo.";
  }
  const threshold = peak * 0.25;
  const lowBuckets = cells.filter((cell) => cell.count < threshold);
  if (lowBuckets.length === 0) {
    return "Actividad estable en el periodo.";
  }
  return `${lowBuckets.length} franjas por debajo del 25% del pico — candidatas a promoción.`;
}
