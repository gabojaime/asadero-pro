import * as z from "zod";
import type {
  CreateRawMaterialInput,
  ReceiveStockInput,
  UnitOfMeasure,
  UpdateRawMaterialInput,
} from "./entities";

export const MAX_NAME_LENGTH = 100;
export const MAX_SKU_LENGTH = 50;
export const QUANTITY_DECIMAL_SCALE = 3;

const unitOfMeasureSchema = z.enum(["kilogram", "unit"]);

const trimmedNameField = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, "El nombre es obligatorio.")
      .max(MAX_NAME_LENGTH, "El nombre no puede superar 100 caracteres."),
  );

const optionalSkuField = z.preprocess(
  (value) => {
    if (value === undefined || value === null) {
      return null;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    }
    return value;
  },
  z
    .string()
    .max(MAX_SKU_LENGTH, "El SKU no puede superar 50 caracteres.")
    .nullable(),
);

function hasAtMostDecimalPlaces(value: number, scale: number): boolean {
  const factor = 10 ** scale;
  return Math.abs(Math.round(value * factor) - value * factor) < Number.EPSILON;
}

export function validateQuantityForUom(
  quantity: number,
  uom: UnitOfMeasure,
): boolean {
  void uom;
  if (!Number.isFinite(quantity) || quantity < 0) {
    return false;
  }
  return hasAtMostDecimalPlaces(quantity, QUANTITY_DECIMAL_SCALE);
}

const receiveQuantityField = z
  .number({
    error: "La cantidad recibida debe ser un número válido.",
  })
  .refine(
    (value) => validateQuantityForUom(value, "kilogram"),
    "La cantidad recibida no puede tener más de 3 decimales.",
  )
  .refine(
    (value) => value > 0,
    "La cantidad recibida debe ser mayor que cero.",
  );

const unitCostField = z
  .number({
    error: "El costo unitario debe ser un número válido.",
  })
  .refine((value) => value >= 0, "El costo unitario no puede ser negativo.")
  .refine(
    (value) => hasAtMostDecimalPlaces(value, 2),
    "El costo unitario no puede tener más de 2 decimales.",
  );

export const createRawMaterialInputSchema = z.object({
  name: trimmedNameField,
  sku: optionalSkuField,
  unitOfMeasure: unitOfMeasureSchema,
});

export const updateRawMaterialInputSchema = z.object({
  name: trimmedNameField,
  sku: optionalSkuField,
});

export const receiveStockInputSchema = z.object({
  incomingQuantity: receiveQuantityField,
  incomingUnitCost: unitCostField,
});

export type ValidationSuccess<T> = {
  success: true;
  data: T;
};

export type ValidationFailure = {
  success: false;
  fieldErrors: Record<string, string>;
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export function mapZodIssuesToFieldErrors(
  issues: z.core.$ZodIssue[],
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string" && fieldErrors[field] === undefined) {
      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
}

export function parseCreateRawMaterialInput(
  input: CreateRawMaterialInput,
): ValidationResult<CreateRawMaterialInput> {
  const result = createRawMaterialInputSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      fieldErrors: mapZodIssuesToFieldErrors(result.error.issues),
    };
  }

  return { success: true, data: result.data };
}

export function parseUpdateRawMaterialInput(
  input: UpdateRawMaterialInput,
): ValidationResult<UpdateRawMaterialInput> {
  const result = updateRawMaterialInputSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      fieldErrors: mapZodIssuesToFieldErrors(result.error.issues),
    };
  }

  return { success: true, data: result.data };
}

export function parseReceiveStockInput(
  input: ReceiveStockInput,
): ValidationResult<ReceiveStockInput> {
  const result = receiveStockInputSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      fieldErrors: mapZodIssuesToFieldErrors(result.error.issues),
    };
  }

  return { success: true, data: result.data };
}
