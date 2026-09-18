import { z } from "zod";
import { DASHBOARD_PERIODS } from "./entities";

export const dashboardPeriodSchema = z.enum(DASHBOARD_PERIODS);

export const merchantOverheadSchema = z
  .number()
  .min(0, "El overhead debe ser cero o positivo.")
  .nullable();

export const seatingTableCountSchema = z
  .number()
  .int("Las mesas deben ser un entero.")
  .positive("Indica al menos una mesa.")
  .nullable();

export const updateDashboardSettingsSchema = z.object({
  monthlyFixedOverhead: merchantOverheadSchema,
  seatingTableCount: seatingTableCountSchema,
});

export type UpdateDashboardSettingsInput = z.infer<
  typeof updateDashboardSettingsSchema
>;

export function parseDashboardPeriod(
  raw: string | undefined,
): (typeof DASHBOARD_PERIODS)[number] {
  const parsed = dashboardPeriodSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  return "last_7_days";
}
