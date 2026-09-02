export type AuthErrorCode =
  | "invalid_credentials"
  | "validation_failed"
  | "not_authenticated"
  | "forbidden"
  | "profile_creation_failed"
  | "unknown";

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    code: AuthErrorCode,
    message: string,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}
