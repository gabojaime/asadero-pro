import * as z from "zod";
import type { CreateStaffUserInput, SignInCredentials } from "./entities";

export const MAX_AUTH_FIELD_LENGTH = 255;
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 72;

const userRoleSchema = z.enum(["admin", "grill_master", "waiter"]);

const emailField = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, "El correo electrónico es obligatorio.")
      .email("Ingresa un correo electrónico válido.")
      .max(MAX_AUTH_FIELD_LENGTH, "El correo no puede superar 255 caracteres."),
  );

const passwordField = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    "La contraseña debe tener al menos 6 caracteres.",
  )
  .max(
    MAX_PASSWORD_LENGTH,
    "La contraseña no puede superar 72 caracteres.",
  );

export const signInCredentialsSchema = z.object({
  email: emailField,
  password: passwordField,
});

export const createStaffUserInputSchema = z.object({
  email: emailField,
  password: passwordField,
  fullName: z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(1, "El nombre completo es obligatorio.")
        .max(
          MAX_AUTH_FIELD_LENGTH,
          "El nombre no puede superar 255 caracteres.",
        ),
    ),
  role: userRoleSchema,
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

export function parseSignInCredentials(
  input: SignInCredentials,
): ValidationResult<SignInCredentials> {
  const result = signInCredentialsSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      fieldErrors: mapZodIssuesToFieldErrors(result.error.issues),
    };
  }

  return { success: true, data: result.data };
}

export function parseCreateStaffUserInput(
  input: CreateStaffUserInput,
): ValidationResult<CreateStaffUserInput> {
  const result = createStaffUserInputSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      fieldErrors: mapZodIssuesToFieldErrors(result.error.issues),
    };
  }

  return { success: true, data: result.data };
}
