import * as z from "zod";
import type {
  CreateMenuItemInput,
  MenuItemKind,
  ProteinGroup,
  UpdateMenuItemInput,
} from "./entities";
import { MenuItemError } from "./errors";

export const MAX_NAME_LENGTH = 255;
export const MAX_WEIGHT_LABEL_LENGTH = 20;

const menuItemKindSchema = z.enum(["meat_plate", "drink", "side"]);
const proteinGroupSchema = z.enum(["beef", "pork", "chicken"]);

const trimmedNameField = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, "El nombre es obligatorio.")
      .max(MAX_NAME_LENGTH, "El nombre no puede superar 255 caracteres."),
  );

function hasAtMostDecimalPlaces(value: number, scale: number): boolean {
  const factor = 10 ** scale;
  return Math.abs(Math.round(value * factor) - value * factor) < Number.EPSILON;
}

const priceField = z
  .number({
    error: "El precio debe ser un número válido.",
  })
  .refine((value) => value >= 0, "El precio no puede ser negativo.")
  .refine(
    (value) => hasAtMostDecimalPlaces(value, 2),
    "El precio no puede tener más de 2 decimales.",
  );

function normalizeNullableString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }
  return null;
}

const nullableProteinField = z.preprocess(
  normalizeNullableString,
  proteinGroupSchema.nullable(),
);

const nullableWeightLabelField = z.preprocess(
  normalizeNullableString,
  z
    .string()
    .max(
      MAX_WEIGHT_LABEL_LENGTH,
      "La porción no puede superar 20 caracteres.",
    )
    .nullable(),
);

export function assertKindFieldRules(
  itemKind: MenuItemKind,
  proteinGroup: ProteinGroup | null,
  weightLabel: string | null,
): void {
  if (itemKind === "meat_plate") {
    if (!proteinGroup) {
      throw new MenuItemError(
        "validation_failed",
        "La proteína es obligatoria para platos de carne.",
        { proteinGroup: "Selecciona una proteína." },
      );
    }
    if (!weightLabel) {
      throw new MenuItemError(
        "validation_failed",
        "La porción es obligatoria para platos de carne.",
        { weightLabel: "Indica la etiqueta de porción." },
      );
    }
    return;
  }

  if (proteinGroup !== null) {
    throw new MenuItemError(
      "validation_failed",
      "Solo los platos de carne pueden tener proteína.",
      { proteinGroup: "Debe estar vacío para este tipo." },
    );
  }

  if (weightLabel !== null) {
    throw new MenuItemError(
      "validation_failed",
      "Solo los platos de carne pueden tener porción.",
      { weightLabel: "Debe estar vacío para este tipo." },
    );
  }
}

const createMenuItemBaseSchema = z.object({
  name: trimmedNameField,
  price: priceField,
  itemKind: menuItemKindSchema,
  proteinGroup: nullableProteinField,
  weightLabel: nullableWeightLabelField,
});

export const createMenuItemInputSchema = createMenuItemBaseSchema.superRefine(
  (data, context) => {
    try {
      assertKindFieldRules(
        data.itemKind,
        data.proteinGroup as ProteinGroup | null,
        data.weightLabel,
      );
    } catch (error) {
      if (error instanceof MenuItemError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          context.addIssue({
            code: "custom",
            path: [field],
            message,
          });
        }
      }
    }
  },
);

export const updateMenuItemInputSchema = z
  .object({
    name: trimmedNameField,
    price: priceField,
    proteinGroup: nullableProteinField,
    weightLabel: nullableWeightLabelField,
  })
  .strict();

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

export function parseCreateMenuItemInput(
  input: CreateMenuItemInput,
): ValidationResult<CreateMenuItemInput> {
  const result = createMenuItemInputSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      fieldErrors: mapZodIssuesToFieldErrors(result.error.issues),
    };
  }

  return { success: true, data: result.data as CreateMenuItemInput };
}

export function parseUpdateMenuItemInput(
  input: UpdateMenuItemInput,
): ValidationResult<UpdateMenuItemInput> {
  const result = updateMenuItemInputSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      fieldErrors: mapZodIssuesToFieldErrors(result.error.issues),
    };
  }

  return { success: true, data: result.data as UpdateMenuItemInput };
}

export function validateUpdateForKind(
  itemKind: MenuItemKind,
  input: UpdateMenuItemInput,
): ValidationResult<UpdateMenuItemInput> {
  const parsed = parseUpdateMenuItemInput(input);
  if (!parsed.success) {
    return parsed;
  }

  try {
    assertKindFieldRules(
      itemKind,
      parsed.data.proteinGroup,
      parsed.data.weightLabel,
    );
  } catch (error) {
    if (error instanceof MenuItemError && error.fieldErrors) {
      return { success: false, fieldErrors: error.fieldErrors };
    }
    throw error;
  }

  return parsed;
}
