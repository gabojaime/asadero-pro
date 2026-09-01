import type { NormalizedOnboardingInput, OnboardingInput } from "./entities";

export const MAX_ONBOARDING_FIELD_LENGTH = 255;

export type ValidationSuccess = {
  success: true;
  data: NormalizedOnboardingInput;
};

export type ValidationFailure = {
  success: false;
  fieldErrors: Record<string, string>;
};

export type ValidationResult = ValidationSuccess | ValidationFailure;

export function validateOnboardingInput(
  input: OnboardingInput,
): ValidationResult {
  const fieldErrors: Record<string, string> = {};

  const merchantName = input.merchantName?.trim() ?? "";
  if (!merchantName) {
    fieldErrors.merchantName = "El nombre del negocio es obligatorio.";
  } else if (merchantName.length > MAX_ONBOARDING_FIELD_LENGTH) {
    fieldErrors.merchantName =
      "El nombre del negocio no puede superar 255 caracteres.";
  }

  const ownerFullName = input.ownerFullName?.trim() ?? "";
  if (!ownerFullName) {
    fieldErrors.ownerFullName = "Tu nombre completo es obligatorio.";
  } else if (ownerFullName.length > MAX_ONBOARDING_FIELD_LENGTH) {
    fieldErrors.ownerFullName = "El nombre no puede superar 255 caracteres.";
  }

  const addressRaw = input.address?.trim() ?? "";
  const phoneRaw = input.phone?.trim() ?? "";

  if (addressRaw.length > MAX_ONBOARDING_FIELD_LENGTH) {
    fieldErrors.address = "La dirección no puede superar 255 caracteres.";
  }

  if (phoneRaw.length > MAX_ONBOARDING_FIELD_LENGTH) {
    fieldErrors.phone = "El teléfono no puede superar 255 caracteres.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  return {
    success: true,
    data: {
      merchantName,
      ownerFullName,
      address: addressRaw.length > 0 ? addressRaw : null,
      phone: phoneRaw.length > 0 ? phoneRaw : null,
    },
  };
}
