import { z } from "zod";

export type WasteReason =
  | "burned_on_grill"
  | "fat_discarded"
  | "spoiled_raw"
  | "customer_return";

export const WASTE_REASON_VALUES = [
  "burned_on_grill",
  "fat_discarded",
  "spoiled_raw",
  "customer_return",
] as const satisfies readonly WasteReason[];

export const WASTE_REASON_LABELS_ES: Record<WasteReason, string> = {
  burned_on_grill: "Quemado en parrilla",
  fat_discarded: "Grasa / recorte descartado",
  spoiled_raw: "Crudo en mal estado",
  customer_return: "Devolución de cliente",
};

export type OperationalWasteLogInput = {
  rawMaterialId: string;
  weightKg: number;
  reason: WasteReason;
};

export type OperationalWasteLog = {
  id: string;
  rawMaterialId: string;
  rawMaterialName: string;
  weightKg: number;
  unitCost: number;
  totalCost: number;
  reason: WasteReason;
  loggedByUserId: string | null;
  loggedByDisplayName: string | null;
  createdAt: string;
};

export type KgRawMaterialOption = {
  id: string;
  name: string;
  quantityOnHand: number;
  unitCost: number;
};

const wasteReasonSchema = z.enum(WASTE_REASON_VALUES);

const weightKgSchema = z
  .number()
  .gt(0, "Los kilos deben ser mayores que cero.")
  .max(999.999, "Los kilos no pueden superar 999.999.");

export const operationalWasteLogInputSchema = z.object({
  rawMaterialId: z.string().uuid("Selecciona un insumo válido."),
  weightKg: weightKgSchema,
  reason: wasteReasonSchema,
});

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateWasteLogTotalCost(
  weightKg: number,
  unitCost: number,
): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new Error("Weight must be greater than zero.");
  }

  if (!Number.isFinite(unitCost) || unitCost < 0) {
    throw new Error("Unit cost must be non-negative.");
  }

  return roundMoney(weightKg * unitCost);
}

function flattenZodErrors(error: z.ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [issue.path.join(".") || "form", issue.message]),
  );
}

export function validateOperationalWasteInput(input: unknown) {
  const result = operationalWasteLogInputSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false as const,
      fieldErrors: flattenZodErrors(result.error),
    };
  }

  return { success: true as const, data: result.data as OperationalWasteLogInput };
}
