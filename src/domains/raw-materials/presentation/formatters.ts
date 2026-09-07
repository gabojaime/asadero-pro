import type { UnitOfMeasure } from "@/domains/raw-materials/domain/entities";

export const UNIT_OF_MEASURE_LABELS: Record<UnitOfMeasure, string> = {
  kilogram: "Kilogramo (kg)",
  unit: "Unidad (pz/paq)",
};

export const UNIT_OF_MEASURE_SUFFIX: Record<UnitOfMeasure, string> = {
  kilogram: "kg",
  unit: "pz",
};

export function formatUnitOfMeasureLabel(uom: UnitOfMeasure): string {
  return UNIT_OF_MEASURE_LABELS[uom];
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatQuantityWithSuffix(
  quantity: number,
  uom: UnitOfMeasure,
): string {
  const formatted = new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(quantity);

  return `${formatted} ${UNIT_OF_MEASURE_SUFFIX[uom]}`;
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
