import { z } from "zod";

const wastePctSchema = z
  .number()
  .min(0, "Waste percentage cannot be negative.")
  .lt(100, "Waste percentage must be less than 100.");

const targetFoodCostPctSchema = z
  .number()
  .gt(0, "Target food cost percentage must be greater than zero.")
  .max(1, "Target food cost percentage must be at most 1.");

export const updateWastePctInputSchema = z.object({
  menuItemId: z.string().uuid(),
  wastePct: wastePctSchema,
});

export const updateTargetFoodCostPctInputSchema = z.object({
  targetFoodCostPct: targetFoodCostPctSchema,
});

export type UpdateWastePctInput = z.infer<typeof updateWastePctInputSchema>;
export type UpdateTargetFoodCostPctInput = z.infer<
  typeof updateTargetFoodCostPctInputSchema
>;

export function parseUpdateWastePctInput(input: unknown) {
  const result = updateWastePctInputSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false as const,
      fieldErrors: flattenZodErrors(result.error),
    };
  }

  return { success: true as const, data: result.data };
}

export function parseUpdateTargetFoodCostPctInput(input: unknown) {
  const result = updateTargetFoodCostPctInputSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false as const,
      fieldErrors: flattenZodErrors(result.error),
    };
  }

  return { success: true as const, data: result.data };
}

function flattenZodErrors(error: z.ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [issue.path.join(".") || "form", issue.message]),
  );
}
