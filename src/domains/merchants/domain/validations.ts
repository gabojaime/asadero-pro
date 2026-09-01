import * as z from "zod";
import type { NormalizedOnboardingInput, OnboardingInput } from "./entities";

export const MAX_ONBOARDING_FIELD_LENGTH = 255;

const requiredTrimmedField = (requiredMessage: string, maxLengthMessage: string) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(1, requiredMessage)
        .max(MAX_ONBOARDING_FIELD_LENGTH, maxLengthMessage),
    );

const optionalNullableTrimmedField = (maxLengthMessage: string) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => value?.trim() ?? "")
    .pipe(z.string().max(MAX_ONBOARDING_FIELD_LENGTH, maxLengthMessage))
    .transform((value) => (value.length > 0 ? value : null));

export const onboardingInputSchema = z.object({
  merchantName: requiredTrimmedField(
    "El nombre del negocio es obligatorio.",
    "El nombre del negocio no puede superar 255 caracteres.",
  ),
  ownerFullName: requiredTrimmedField(
    "Tu nombre completo es obligatorio.",
    "El nombre no puede superar 255 caracteres.",
  ),
  address: optionalNullableTrimmedField(
    "La dirección no puede superar 255 caracteres.",
  ).optional(),
  phone: optionalNullableTrimmedField(
    "El teléfono no puede superar 255 caracteres.",
  ).optional(),
});

export type ValidationSuccess = {
  success: true;
  data: NormalizedOnboardingInput;
};

export type ValidationFailure = {
  success: false;
  fieldErrors: Record<string, string>;
};

export type ValidationResult = ValidationSuccess | ValidationFailure;

function mapZodIssuesToFieldErrors(
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

export function validateOnboardingInput(
  input: OnboardingInput,
): ValidationResult {
  const result = onboardingInputSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      fieldErrors: mapZodIssuesToFieldErrors(result.error.issues),
    };
  }

  return {
    success: true,
    data: {
      merchantName: result.data.merchantName,
      ownerFullName: result.data.ownerFullName,
      address: result.data.address ?? null,
      phone: result.data.phone ?? null,
    },
  };
}
