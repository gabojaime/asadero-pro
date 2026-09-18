import { calculateRealCostPerKg } from "@/domains/waste/domain/cost-formulas";
import { formatCalendarDayKey } from "@/domains/waste/domain/operational-waste-calendar";
import type { DashboardSnapshot, PeriodBounds } from "../domain/entities";
import { DASHBOARD_TIMEZONE } from "../domain/entities";
import {
  bucketDailyAverageTicket,
  bucketDailyFoodCostPct,
  bucketDailyMedian,
  buildHeatmapCaption,
  calculateAverageTicket,
  calculateAvgContributionPerPortion,
  calculateBepPortions,
  calculateBepProgressPct,
  calculateBepRevenue,
  calculateContributionMarginRatio,
  calculateFoodCostPct,
  calculateIngredientCostConsumed,
  calculateLoggedWasteCost,
  calculateNetSales,
  calculateTableTurnover,
  calculateTicketTimeStats,
  calculateWastePct,
  getFoodCostAlertLevel,
  getTicketTimeAlertLevel,
  getWasteAlertLevel,
  rankPlateContributions,
  TURNOVER_LOW_THRESHOLD,
} from "../domain/formulas";
import { formatPeriodLabel } from "../domain/period-bounds";
import type {
  CompletedOrderRow,
  MetricsReadRepository,
  OrderItemContributionRow,
  RecipeCostRow,
  TableSessionRow,
  WasteLogRow,
} from "../domain/repository";

const WASTE_REASON_LABELS: Record<string, string> = {
  burned_on_grill: "Quemado en parrilla",
  fat_discarded: "Grasa descartada",
  spoiled_raw: "Crudo en mal estado",
  customer_return: "Devolución cliente",
};

function revenueDayKey(iso: string): string {
  return formatCalendarDayKey(DASHBOARD_TIMEZONE, new Date(iso));
}

function orderTicketMinutes(order: CompletedOrderRow): number | null {
  if (!order.sentToKitchenAt) {
    return null;
  }
  const end = order.readyAt ?? order.revenueAtIso;
  const minutes =
    (new Date(end).getTime() - new Date(order.sentToKitchenAt).getTime()) /
    60_000;
  if (!Number.isFinite(minutes) || minutes < 0) {
    return null;
  }
  return minutes;
}

function buildRecipeCostIndex(recipes: RecipeCostRow[]) {
  const map = new Map<string, RecipeCostRow[]>();
  for (const row of recipes) {
    const list = map.get(row.menuItemId) ?? [];
    list.push(row);
    map.set(row.menuItemId, list);
  }
  return map;
}

function lineVariableCost(
  item: OrderItemContributionRow,
  recipes: RecipeCostRow[],
): number {
  return recipes.reduce((sum, recipe) => {
    const wastePct = recipe.wastePct ?? 0;
    const realPerKg = calculateRealCostPerKg(recipe.unitCost, wastePct);
    return sum + item.quantity * recipe.quantityKg * realPerKg;
  }, 0);
}

function aggregateContribution(
  items: OrderItemContributionRow[],
  recipeIndex: Map<string, RecipeCostRow[]>,
) {
  const byMenu = new Map<
    string,
    {
      menuItemId: string;
      name: string;
      proteinGroup: string | null;
      weightLabel: string | null;
      marginDollars: number;
    }
  >();

  for (const item of items) {
    if (item.itemKind !== "meat_plate") {
      continue;
    }
    const recipes = recipeIndex.get(item.menuItemId) ?? [];
    const variableCost = lineVariableCost(item, recipes);
    const margin = item.subtotal - variableCost;
    const existing = byMenu.get(item.menuItemId);
    if (existing) {
      existing.marginDollars += margin;
    } else {
      byMenu.set(item.menuItemId, {
        menuItemId: item.menuItemId,
        name: item.name,
        proteinGroup: item.proteinGroup,
        weightLabel: item.weightLabel,
        marginDollars: margin,
      });
    }
  }

  return [...byMenu.values()];
}

function buildWasteMix(rows: WasteLogRow[]) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.reason, (totals.get(row.reason) ?? 0) + row.weightKg);
  }
  return [...totals.entries()].map(([reason, weightKg]) => ({
    reason,
    label: WASTE_REASON_LABELS[reason] ?? reason,
    weightKg,
  }));
}

function buildTurnoverByDay(
  sessions: TableSessionRow[],
  bounds: PeriodBounds,
  seatingTableCount: number | null,
): { series: { dayKey: string; label: string; value: number }[]; caption: string } {
  if (!seatingTableCount || seatingTableCount <= 0) {
    return {
      series: bounds.dayKeys.map((dayKey) => ({
        dayKey,
        label: dayKey.slice(8),
        value: 0,
      })),
      caption: "Configura el número de mesas en el encabezado.",
    };
  }

  const counts = new Map<string, number>();
  for (const key of bounds.dayKeys) {
    counts.set(key, 0);
  }
  for (const session of sessions) {
    const key = revenueDayKey(session.closedAt);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const series = bounds.dayKeys.map((dayKey) => ({
    dayKey,
    label: dayKey.slice(8),
    value:
      calculateTableTurnover(
        counts.get(dayKey) ?? 0,
        seatingTableCount,
        1,
      ) ?? 0,
  }));

  const avgTurnover =
    calculateTableTurnover(
      sessions.length,
      seatingTableCount,
      bounds.daysInPeriod,
    ) ?? 0;

  const caption =
    bounds.period === "last_7_days" && avgTurnover < TURNOVER_LOW_THRESHOLD
      ? `Rotación baja (${avgTurnover.toFixed(1)} ses/mesa/día).`
      : `Rotación promedio: ${avgTurnover.toFixed(1)} ses/mesa/día.`;

  return { series, caption };
}

function buildHeatmapCells(sessions: TableSessionRow[]) {
  const grid = new Map<string, number>();
  for (const session of sessions) {
    const key = `${session.dayOfWeek}-${session.hour}`;
    grid.set(key, (grid.get(key) ?? 0) + 1);
  }
  const cells: { dayOfWeek: number; hour: number; count: number }[] = [];
  for (let dow = 0; dow < 7; dow += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      cells.push({
        dayOfWeek: dow,
        hour,
        count: grid.get(`${dow}-${hour}`) ?? 0,
      });
    }
  }
  return cells;
}

export async function buildDashboardSnapshot(
  merchantId: string,
  bounds: PeriodBounds,
  repo: MetricsReadRepository,
): Promise<DashboardSnapshot> {
  const [
    settings,
    orders,
    movements,
    wasteLogs,
    meatItems,
    recipes,
    sessions,
  ] = await Promise.all([
    repo.getMerchantSettings(merchantId),
    repo.listCompletedOrders(merchantId, bounds),
    repo.listInventoryMovements(merchantId, bounds),
    repo.listWasteLogs(merchantId, bounds),
    repo.listMeatPlateOrderItems(merchantId, bounds),
    repo.listRecipeCosts(merchantId),
    repo.listTableSessions(merchantId, bounds),
  ]);

  const orderTotals = orders.map((order) => order.totalAmount);
  const netSales = calculateNetSales(orderTotals);
  const completedOrderCount = orders.length;

  const deductionMovements = movements.filter(
    (row) => row.movementType === "order_deduction",
  );
  const receiptKgMovements = movements.filter(
    (row) =>
      row.movementType === "receipt" && row.unitOfMeasure === "kilogram",
  );

  const ingredientCostConsumed = calculateIngredientCostConsumed(
    deductionMovements,
  );
  const loggedWasteCost = calculateLoggedWasteCost(wasteLogs);
  const totalVariableCost = ingredientCostConsumed + loggedWasteCost;

  const foodCostPct = calculateFoodCostPct(
    netSales,
    ingredientCostConsumed,
    loggedWasteCost,
  );
  const foodCostAlert = getFoodCostAlertLevel(
    foodCostPct,
    settings.targetFoodCostPct,
  );

  const foodCostCaption =
    completedOrderCount === 0
      ? "Sin ventas cerradas en el periodo"
      : foodCostAlert === "alert"
        ? "Por encima de meta — revisa precios y merma"
        : foodCostAlert === "success"
          ? "Dentro de meta"
          : "Monitorea costo de alimentos";

  const salesByDay = bounds.dayKeys.map((dayKey) => ({
    dayKey,
    netSales: orders
      .filter((order) => revenueDayKey(order.revenueAtIso) === dayKey)
      .reduce((sum, order) => sum + order.totalAmount, 0),
    orderCount: orders.filter(
      (order) => revenueDayKey(order.revenueAtIso) === dayKey,
    ).length,
  }));

  const costByDay = bounds.dayKeys.map((dayKey) => {
    const movementCost = deductionMovements
      .filter((row) => revenueDayKey(row.createdAt) === dayKey)
      .reduce((sum, row) => sum + row.quantity * row.unitCost, 0);
    const wasteCost = wasteLogs
      .filter((row) => revenueDayKey(row.createdAt) === dayKey)
      .reduce((sum, row) => sum + row.totalCost, 0);
    return { dayKey, cost: movementCost + wasteCost };
  });

  const foodCostDailySeries = bucketDailyFoodCostPct(
    bounds.dayKeys,
    salesByDay,
    costByDay,
  );

  const recipeIndex = buildRecipeCostIndex(recipes);
  const contributionRanking = rankPlateContributions(
    aggregateContribution(meatItems, recipeIndex),
  );

  const contributionRatio = calculateContributionMarginRatio(
    netSales,
    totalVariableCost,
  );
  const overhead = settings.monthlyFixedOverhead;
  const bepRevenue =
    overhead && overhead > 0
      ? calculateBepRevenue(overhead, contributionRatio)
      : null;
  const bepProgressPct = calculateBepProgressPct(netSales, bepRevenue);

  const expectedProgress =
    bounds.period === "month_to_date" && bounds.daysInMonth > 0
      ? (bounds.monthToDateDaysElapsed / bounds.daysInMonth) * 100 - 10
      : null;

  const bepCaption =
    !overhead || overhead <= 0
      ? "Configura el overhead mensual fijo arriba."
      : bepProgressPct !== null &&
          expectedProgress !== null &&
          bepProgressPct < expectedProgress
        ? "Por debajo del ritmo mensual esperado."
        : bepRevenue
          ? `Meta de equilibrio: $${bepRevenue.toFixed(0)}`
          : "Sin margen de contribución positivo.";

  const meatPlatePortionsSold = meatItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const avgContribution = calculateAvgContributionPerPortion(
    netSales,
    totalVariableCost,
    meatPlatePortionsSold,
  );
  const bepPortionsRemaining =
    overhead && overhead > 0
      ? calculateBepPortions(overhead, avgContribution)
      : null;

  const bepPortionsCaption =
    bepPortionsRemaining === null
      ? "Sin porciones de referencia en el periodo."
      : `~${bepPortionsRemaining} platos fuertes para cubrir fijos (MTD).`;

  const wasteKg = wasteLogs.reduce((sum, row) => sum + row.weightKg, 0);
  const receiptKg = receiptKgMovements.reduce(
    (sum, row) => sum + row.quantity,
    0,
  );
  const wastePct = calculateWastePct(wasteKg, receiptKg);
  const wasteAlert = getWasteAlertLevel(wastePct);

  const wasteCaption =
    receiptKg <= 0
      ? "Sin recepciones de carne en kg en el periodo"
      : wasteKg === 0
        ? "Sin mermas registradas — 0%"
        : wasteAlert === "alert"
          ? "Merma ≥ 5% — revisa parrilla y recepción"
          : "Merma bajo 5%";

  const averageTicket = calculateAverageTicket(netSales, completedOrderCount);
  const averageTicketDailySeries = bucketDailyAverageTicket(
    bounds.dayKeys,
    salesByDay,
  );
  const averageTicketCaption =
    averageTicket === null
      ? "Sin ventas cerradas en el periodo"
      : `Ticket promedio: $${averageTicket.toFixed(2)}`;

  const ticketMinutes = orders
    .map(orderTicketMinutes)
    .filter((value): value is number => value !== null);
  const { median: ticketTimeMedian, p90: ticketTimeP90 } =
    calculateTicketTimeStats(ticketMinutes);
  const ticketTimeAlert = getTicketTimeAlertLevel(
    ticketTimeMedian,
    ticketTimeP90,
  );
  const ticketTimeCaption =
    ticketMinutes.length === 0
      ? "Sin comandas con tiempos de cocina"
      : `Mediana ${ticketTimeMedian} min · P90 ${ticketTimeP90} min`;

  const minutesByDay = orders.flatMap((order) => {
    const minutes = orderTicketMinutes(order);
    if (minutes === null) {
      return [];
    }
    return [{ dayKey: revenueDayKey(order.revenueAtIso), minutes }];
  });
  const ticketTimeDailyMedianSeries = bucketDailyMedian(
    bounds.dayKeys,
    minutesByDay,
  );

  const sessionHeatmap = buildHeatmapCells(sessions);
  const heatmapCaption =
    sessions.length === 0
      ? "Al completar pedidos dine-in se llenará el mapa de horas."
      : buildHeatmapCaption(sessionHeatmap);

  const turnover = buildTurnoverByDay(
    sessions,
    bounds,
    settings.seatingTableCount,
  );

  return {
    period: bounds.period,
    periodLabel: formatPeriodLabel(bounds.period),
    settings,
    netSales,
    completedOrderCount,
    ingredientCostConsumed,
    loggedWasteCost,
    totalVariableCost,
    foodCostPct,
    foodCostAlert,
    foodCostCaption,
    foodCostDailySeries,
    contributionRanking,
    bepRevenue,
    bepProgressPct,
    bepCaption,
    bepPortionsRemaining,
    bepPortionsCaption,
    wastePct,
    wasteAlert,
    wasteCaption,
    wasteMix: buildWasteMix(wasteLogs),
    averageTicket,
    averageTicketCaption,
    averageTicketDailySeries,
    ticketTimeMedian,
    ticketTimeP90,
    ticketTimeAlert,
    ticketTimeCaption,
    ticketTimeDailyMedianSeries,
    sessionHeatmap,
    heatmapCaption,
    turnoverByDayOfWeek: turnover.series,
    turnoverCaption: turnover.caption,
    meatPlatePortionsSold,
  };
}
